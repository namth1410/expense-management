import { Picker } from "@react-native-picker/picker";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { createExpense, listenToExpenses, updateExpense } from "./expenseApi"; // Import API tạo chi phí
import { MultiSelect } from "react-native-element-dropdown";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function sendPushNotification(expoPushToken) {
  const message = {
    to: expoPushToken,
    sound: "default",
    title: "Original Title",
    body: "And here is the body!",
    data: { someData: "goes here" },
  };

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
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
  const [editModalVisible, setEditModalVisible] = useState(false); // Modal chỉnh sửa

  const notificationListener = useRef();
  const responseListener = useRef();

  // Hàm xử lý tạo chi phí
  const handleCreateExpense = async () => {
    const { name, payer, amount } = newExpense;

    // Kiểm tra validation
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
    };

    try {
      await createExpense(expenseData);
      setModalVisible(false); // Đóng modal sau khi tạo chi phí
      setNewExpense({
        name: "",
        payer: "",
        amount: 0,
        paided: [],
      });
      ToastAndroid.show("Chi phí đã được tạo thành công!", ToastAndroid.SHORT);
    } catch (error) {
      ToastAndroid.show("Đã xảy ra lỗi khi tạo chi phí.", ToastAndroid.SHORT);
    }
  };

  const handleEditExpense = async () => {
    const { name, amount } = newExpense;

    if (!name.trim()) {
      alert("Tên chi phí không được để trống.");
      return;
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      alert("Số tiền chi trả phải là số dương.");
      return;
    }

    const updatedExpense = {
      name,
      payer: newExpense.payer,
      amount: parseFloat(amount),
      paided: newExpense.paided,
    };

    try {
      await updateExpense(selectedExpense.id, updatedExpense);
      setEditModalVisible(false);
      setNewExpense({
        name: "",
        payer: "",
        amount: 0,
        paided: [],
      });
    } catch (error) {
      alert("Đã xảy ra lỗi khi cập nhật chi phí.");
    }
  };

  const handleEditButtonPress = (expense) => {
    setSelectedExpense(expense);
    console.log(expense);
    setEditModalVisible(true);
  };

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then((token) => setExpoPushToken(token ?? ""))
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
              <Picker.Item label="Nam" value="Nam" />
              <Picker.Item label="Tân" value="Tân" />
              <Picker.Item label="Tuyển" value="Tuyển" />
              <Picker.Item label="Định" value="Định" />
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
                setNewExpense({ ...selectedExpense, name: text })
              }
            />

            <Text style={styles.label}>Người chi trả</Text>
            <Picker
              selectedValue={selectedExpense?.payer}
              style={styles.picker}
              onValueChange={(itemValue) =>
                setNewExpense({ ...selectedExpense, payer: itemValue })
              }
            >
              <Picker.Item label="Chọn người chi trả" value="" />
              <Picker.Item label="Nam" value="Nam" />
              <Picker.Item label="Tân" value="Tân" />
              <Picker.Item label="Tuyển" value="Tuyển" />
              <Picker.Item label="Định" value="Định" />
            </Picker>

            <TextInput
              style={styles.input}
              placeholder="Số tiền chi trả"
              value={selectedExpense?.amount.toString()}
              onChangeText={(text) =>
                setNewExpense({
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
              data={[
                { label: "Nam", value: "Nam" },
                { label: "Tân", value: "Tân" },
                { label: "Tuyển", value: "Tuyển" },
                { label: "Định", value: "Định" },
              ]}
              labelField="label"
              valueField="value"
              placeholder="Select item"
              searchPlaceholder="Search..."
              value={selectedExpense?.paided || []} // Đảm bảo là một mảng
              onChange={(items) => {
                // `items` là mảng chứa các mục đã chọn
                console.log(items);
                setSelectedExpense((prev) => ({
                  ...prev,
                  paided: items.map((item) => item), // Chỉ lấy giá trị của các mục đã chọn
                }));
              }}
              selectedStyle={styles.selectedStyle}
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
        renderItem={({ item }) => (
          <View style={styles.expenseItem}>
            <Text style={styles.expenseText}>Tên: {item.name}</Text>
            <Text style={styles.expenseText}>Người chi trả: {item.payer}</Text>
            <Text style={styles.expenseText}>Số tiền: {item.amount}</Text>
            <Button
              title="Chỉnh sửa"
              onPress={() => handleEditButtonPress(item)}
            />
          </View>
        )}
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
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Màu nền tối cho modal
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
  selectedStyle: {
    borderRadius: 12,
  },
});
