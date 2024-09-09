import { Picker } from "@react-native-picker/picker";
import { Timestamp } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import AntDesign from "@expo/vector-icons/AntDesign";
import Constants from "expo-constants";

import {
  Button,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { MultiSelect } from "react-native-element-dropdown";
import { PEOPLE_LIST } from "./constants";
import {
  createExpense,
  getAllPushTokens,
  listenToExpenses,
  savePushTokenToDatabase,
  updateExpense,
} from "./expenseApi";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function sendPushNotification(tokens) {
  async function sendNotification(token) {
    const message = {
      to: token,
      sound: "default",
      title: "Có 1 chi phí mới",
      body: "Xem ngay thôi!",
      data: { someData: "goes here" },
      android: {
        priority: "high",
        visibility: "public",
      },
    };

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const responseJson = await response.json();
      console.log(`Push notification sent to ${token}:`, responseJson);
    } catch (error) {
      console.error(`Error sending push notification to ${token}:`, error);
    }
  }

  for (const token of tokens) {
    sendNotification(token);
  }
}

function handleRegistrationError(errorMessage) {
  alert(errorMessage);
  throw new Error(errorMessage);
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      handleRegistrationError(
        "Permission not granted to get push token for push notification!"
      );
      return;
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    if (!projectId) {
      handleRegistrationError("Project ID not found");
    }
    try {
      const pushTokenString = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log(pushTokenString);
      return pushTokenString;
    } catch (e) {
      handleRegistrationError(`${e}`);
    }
  } else {
    handleRegistrationError("Must use physical device for push notifications");
  }
}

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState("");
  const [notification, setNotification] = useState(undefined);

  const [newExpense, setNewExpense] = useState({
    name: "",
    payer: "",
    amount: 0,
    paided: [],
  });

  const [expenses, setExpenses] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const notificationListener = useRef();
  const responseListener = useRef();

  const handleCreateExpense = async () => {
    const { name, payer, amount } = newExpense;

    if (!name.trim()) {
      ToastAndroid.show("Tên chi phí không được để trống.", ToastAndroid.SHORT);
      return;
    }

    if (!payer.trim()) {
      ToastAndroid.show(
        "Người chi trả không được để trống.",
        ToastAndroid.SHORT
      );
      return;
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      ToastAndroid.show(
        "Số tiền chi trả phải là số dương.",
        ToastAndroid.SHORT
      );
      return;
    }

    const expenseData = {
      name,
      payer,
      amount: parseFloat(amount),
      paided: newExpense.paided,
      dateCreated: Timestamp.fromDate(new Date()),
    };

    try {
      await createExpense(expenseData);
      setModalVisible(false);
      setNewExpense({
        name: "",
        payer: "",
        amount: 0,
        paided: [],
      });
      getAllPushTokens().then((tokens) => {
        sendPushNotification(tokens);
      });
      ToastAndroid.show("Chi phí đã được tạo thành công!", ToastAndroid.SHORT);
    } catch (error) {
      ToastAndroid.show("Đã xảy ra lỗi khi tạo chi phí.", ToastAndroid.SHORT);
    }
    console.log(notification);
  };

  const handleEditExpense = async () => {
    const { name, amount } = selectedExpense;
    if (!name.trim()) {
      alert("Tên chi phí không được để trống.");
      return;
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      alert("Số tiền chi trả phải là số dương.");
      return;
    }

    try {
      await updateExpense(selectedExpense.id, selectedExpense);
      setEditModalVisible(false);
      setSelectedExpense(null);
    } catch (error) {
      alert("Đã xảy ra lỗi khi cập nhật chi phí.");
    }
  };

  const handleEditButtonPress = (expense) => {
    setSelectedExpense(expense);
    setEditModalVisible(true);
  };

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then((token) => {
        setExpoPushToken(token ?? "");
        savePushTokenToDatabase(token);
      })
      .catch((error) => setExpoPushToken(`${error}`));

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(response);
      });

    const unsubscribe = listenToExpenses(setExpenses);

    return () => {
      notificationListener.current &&
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      responseListener.current &&
        Notifications.removeNotificationSubscription(responseListener.current);
      unsubscribe();
    };
  }, []);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "space-around",
        paddingTop: Constants.statusBarHeight,
      }}
    >
      <StatusBar
        barStyle="dark-content" // Chế độ màu của văn bản thanh trạng thái
        backgroundColor="#ffffff" // Màu nền thanh trạng thái
        translucent={false} // Có làm trong suốt không
      />
      <Text>Your Expo push token: {expoPushToken}</Text>
      {/* <Text>Your Expo push token: {expoPushToken}</Text>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text>Title: {notification && notification.request.content.title} </Text>
        <Text>Body: {notification && notification.request.content.body}</Text>
        <Text>Data: {notification && JSON.stringify(notification.request.content.data)}</Text>
      </View>
      <Button
        title="Press to Send Notification"
        onPress={async () => {
          await sendPushNotification(expoPushToken);
        }}
      /> */}

      <Button title="Tạo chi phí" onPress={() => setModalVisible(true)} />

      {/* Modal form nhập chi phí */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
        style={{ zIndex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Tạo Chi Phí</Text>

            {/* Nhập tên chi phí */}
            <TextInput
              style={styles.input}
              placeholder="Tên chi phí"
              value={newExpense.name}
              onChangeText={(text) =>
                setNewExpense({ ...newExpense, name: text })
              }
            />
            {/* Nhập người chi trả */}
            <Text
              style={{
                fontSize: 16,
                marginBottom: 5,
                fontWeight: "bold",
              }}
            >
              Người chi trả
            </Text>

            <Picker
              selectedValue={newExpense.payer}
              style={styles.picker}
              onValueChange={(itemValue) =>
                setNewExpense({ ...newExpense, payer: itemValue })
              }
            >
              <Picker.Item label="Chọn người chi trả" value="" />
              {PEOPLE_LIST.map((person) => (
                <Picker.Item
                  key={person.value}
                  label={person.label}
                  value={person.value}
                />
              ))}
            </Picker>

            {/* Nhập số tiền chi trả */}
            <TextInput
              style={styles.input}
              placeholder="Số tiền chi trả"
              value={newExpense.amount.toString()}
              onChangeText={(text) =>
                setNewExpense({ ...newExpense, amount: parseFloat(text) || 0 })
              }
              keyboardType="numeric"
              inputMode="numeric"
            />

            <View style={styles.buttonGroup}>
              {/* Button hủy */}
              <Button title="Hủy" onPress={() => setModalVisible(false)} />

              {/* Button tạo chi phí */}
              <Button title="Tạo" onPress={handleCreateExpense} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal chỉnh sửa chi phí */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(!editModalVisible)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Chỉnh Sửa Chi Phí</Text>

            <TextInput
              style={styles.input}
              placeholder="Tên chi phí"
              value={selectedExpense?.name}
              onChangeText={(text) =>
                setSelectedExpense({ ...selectedExpense, name: text })
              }
            />

            <Text style={styles.label}>Người chi trả</Text>
            <Picker
              selectedValue={selectedExpense?.payer}
              style={styles.picker}
              onValueChange={(itemValue) =>
                setSelectedExpense({ ...selectedExpense, payer: itemValue })
              }
            >
              <Picker.Item label="Chọn người chi trả" value="" />
              {PEOPLE_LIST.map((person) => (
                <Picker.Item
                  key={person.value}
                  label={person.label}
                  value={person.value}
                />
              ))}
            </Picker>

            <TextInput
              style={styles.input}
              placeholder="Số tiền chi trả"
              value={selectedExpense?.amount.toString()}
              onChangeText={(text) =>
                setSelectedExpense({
                  ...selectedExpense,
                  amount: parseFloat(text) || 0,
                })
              }
              keyboardType="numeric"
              inputMode="numeric"
            />

            <Text style={styles.label}>Người đã trả tiền</Text>
            <MultiSelect
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              iconStyle={styles.iconStyle}
              search
              data={PEOPLE_LIST.filter(
                (person) => person.value !== selectedExpense?.payer
              )}
              labelField="label"
              valueField="value"
              placeholder="Select item"
              searchPlaceholder="Search..."
              value={selectedExpense?.paided || []}
              onChange={(items) => {
                setSelectedExpense((prev) => ({
                  ...prev,
                  paided: items.map((item) => item),
                }));
              }}
              selectedStyle={styles.selectedStyle}
              renderItem={(item) => (
                <View style={[styles.item, { backgroundColor: item.color }]}>
                  <Text style={styles.itemText}>{item.label}</Text>
                </View>
              )}
              renderSelectedItem={(item, unSelect) => (
                <TouchableOpacity onPress={() => unSelect && unSelect(item)}>
                  <View
                    style={[
                      styles.selectedStyle,
                      { backgroundColor: item.color },
                    ]}
                  >
                    <Text style={styles.textSelectedStyle}>{item.label}</Text>
                    <AntDesign color="white" name="delete" size={17} />
                  </View>
                </TouchableOpacity>
              )}
            />

            <View style={styles.buttonGroup}>
              <Button title="Hủy" onPress={() => setEditModalVisible(false)} />
              <Button title="Cập nhật" onPress={handleEditExpense} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Hiển thị danh sách chi phí */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        style={{ width: "100%" }}
        renderItem={({ item }) => {
          const payerPerson = PEOPLE_LIST.find((p) => p.value === item.payer);
          const payerColor = payerPerson ? payerPerson.color : "#fff";

          return (
            <View style={styles.expenseItem}>
              <Text style={styles.expenseText}>Tên: {item.name}</Text>
              <View style={[styles.paidContainer]}>
                <Text style={styles.expenseText}>Người chi trả: </Text>
                <View
                  style={[
                    {
                      backgroundColor: payerColor,
                    },
                    styles.paidTag,
                  ]}
                >
                  <Text style={styles.paidTagText}>{item.payer}</Text>
                </View>
              </View>
              <Text style={styles.expenseText}>
                Số tiền:{" "}
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(item.amount)}
              </Text>
              <View style={styles.paidContainer}>
                <Text style={styles.expenseText}>Đã trả: </Text>
                {item.paided.map((payer) => {
                  const person = PEOPLE_LIST.find((p) => p.value === payer);
                  return (
                    <View
                      key={payer}
                      style={[
                        styles.paidTag,
                        { backgroundColor: person?.color },
                      ]}
                    >
                      <Text style={styles.paidTagText}>{payer}</Text>
                    </View>
                  );
                })}
              </View>
              <Button
                title="Chỉnh sửa"
                onPress={() => handleEditButtonPress(item)}
              />
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    borderColor: "#ccc",
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  picker: {
    width: "100%",
    height: 50,
    marginBottom: 10,
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingTop: 15,
  },
  expenseItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    width: "100%",
  },
  expenseText: {
    fontSize: 16,
  },
  paidContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    paddingBottom: 10,
  },
  paidTag: {
    borderRadius: 5,
    padding: 5,
    marginRight: 5,
    marginBottom: 5,
  },
  paidTagText: {
    color: "#fff",
  },
  dropdown: {
    height: 50,
    backgroundColor: "transparent",
    borderBottomColor: "gray",
    borderBottomWidth: 0.5,
  },
  placeholderStyle: {
    fontSize: 16,
  },
  selectedTextStyle: {
    fontSize: 14,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
  icon: {
    marginRight: 5,
  },
  item: {
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
  },
  itemText: {
    color: "#fff",
  },
  selectedStyle: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "white",
    shadowColor: "#000",
    marginTop: 8,
    marginRight: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,

    elevation: 2,
  },
  textSelectedStyle: {
    marginRight: 5,
    fontSize: 16,
    color: "white",
  },
});
