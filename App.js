import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, Button, StyleSheet, Alert, ActivityIndicator, FlatList } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { auth, db, app } from './firebaseConfig'; 

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // User creation state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [adminTab, setAdminTab] = useState('Members');
  const [members, setMembers] = useState([]);
  const [logs, setLogs] = useState([]);

  const checkUserRole = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        setIsAdmin(userDoc.data().isAdmin || false);
      }
    } catch (error) {
      console.error("Error checking role:", error);
    }
  };

  const fetchAdminData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(usersList);

      const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQu8YQc9mKGfi_lvmp8h1pKfc0x-fd_eKEwOp8F_b-slPsZTURbNKcQU_utb0og7aW/exec';
      const response = await fetch(GOOGLE_SCRIPT_URL);
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        setLogs(Array.isArray(data) ? data : []);
      } catch (e) {
        setLogs([]);
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  };

  const handleCreateUser = async () => {
    try {
      // Initialize a temporary secondary auth instance to prevent session takeover
      const tempApp = initializeApp(app.options, 'tempApp');
      const tempAuth = getAuth(tempApp);
      
      const userCredential = await createUserWithEmailAndPassword(tempAuth, newEmail, newPassword);
      
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: newEmail,
        isAdmin: false
      });
      
      // Clean up secondary instance
      tempApp.delete();
      
      Alert.alert("Success", "User added successfully");
      setNewEmail('');
      setNewPassword('');
      fetchAdminData();
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) checkUserRole(currentUser.uid);
      else setIsAdmin(false);
      setLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isAdmin) fetchAdminData();
  }, [isAdmin]);

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) { Alert.alert("Error", error.message); }
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (isSubmitting) return; 
    setScanned(true);
    setIsSubmitting(true);
    try {
      const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQu8YQc9mKGfi_lvmp8h1pKfc0x-fd_eKEwOp8F_b-slPsZTURbNKcQU_utb0og7aW/exec';
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.email, qrData: data, details: "App Scan Entry" }),
      });
      const result = await response.json();
      if(result.status === "success") Alert.alert("Success!", "Logged to Sheets.");
      else throw new Error(result.message || "Unknown error");
    } catch (error) { 
      Alert.alert("Error", error.message); 
      setScanned(false);
    } finally { setIsSubmitting(false); }
  };

  if (loadingAuth) return <View style={styles.centerContainer}><ActivityIndicator size="large" /></View>;

  if (!user) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.title}>Login</Text>
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button title="Login" onPress={handleLogin} />
      </View>
    );
  }

  if (isAdmin) {
    return (
      <View style={styles.adminContainer}>
        <Text style={styles.title}>Admin Portal</Text>
        <View style={styles.tabBar}>
          <Button title="Members" onPress={() => setAdminTab('Members')} />
          <Button title="Logs" onPress={() => setAdminTab('Logs')} />
          <Button title="Add User" onPress={() => setAdminTab('AddUser')} />
        </View>
        
        {adminTab === 'Members' && (
          <FlatList data={members} keyExtractor={item => item.id} renderItem={({item}) => <Text style={styles.item}>{item.email}</Text>} />
        )}
        {adminTab === 'Logs' && (
          <FlatList data={logs} keyExtractor={(item, index) => index.toString()} renderItem={({item}) => <Text style={styles.item}>{item[0]} - {item[2]}</Text>} />
        )}
        {adminTab === 'AddUser' && (
          <View style={styles.addUserContainer}>
            <TextInput style={styles.input} placeholder="New User Email" value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="New User Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <Button title="Create User" onPress={handleCreateUser} />
          </View>
        )}
        <Button title="Logout" onPress={() => signOut(auth)} color="red" />
      </View>
    );
  }

  if (!permission) return <View style={styles.centerContainer}><Button onPress={requestPermission} title="Grant Camera Access" /></View>;

  return (
    <View style={styles.scannerContainer}>
      <CameraView style={StyleSheet.absoluteFillObject} onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} />
      <View style={styles.topBar}>
        <Text>{user.email}</Text>
        <Button title="Logout" onPress={() => signOut(auth)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  authContainer: { flex: 1, justifyContent: 'center', padding: 20 },
  adminContainer: { flex: 1, paddingTop: 60, padding: 20 },
  scannerContainer: { flex: 1 },
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 15, paddingHorizontal: 15 },
  topBar: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 10, borderRadius: 8 },
  item: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  addUserContainer: { padding: 20 }
});