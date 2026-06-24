import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
// UPDATED: Import the new CameraView component for SDK 51
import { Camera, CameraView } from 'expo-camera';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig'; 

export default function App() {
  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Camera State
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- AUTHENTICATION LISTENER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  // --- CAMERA PERMISSIONS ---
  useEffect(() => {
    if (user) {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    }
  }, [user]);

  // --- AUTHENTICATION HANDLERS ---
  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
    
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        Alert.alert("Success", "Account created! You are now logged in.");
      }
    } catch (error) {
      Alert.alert("Authentication Error", error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // --- QR SCANNER HANDLER ---
  const handleBarCodeScanned = async ({ type, data }) => {
    if (isSubmitting) return; 
    
    setScanned(true);
    setIsSubmitting(true);
    
    try {
      const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwDtnzOfoFhnp1JAXn6gC4moV9EeuPdSj31tfliia7DdM2K6c4lekVGEyCUPB21kRrE/exec';
      
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.email,
          qrData: data,
          details: "App Scan Entry"
        }),
      });
      
      const result = await response.json();
      
      if(result.status === "success") {
        Alert.alert(
          "Success!",
          "Data logged to Google Sheets successfully.",
          [{ text: "Scan Another", onPress: () => setScanned(false) }]
        );
      } else {
        Alert.alert("Error", "Failed to log data. Check your Google Script.");
        setScanned(false);
      }
    } catch (error) {
      Alert.alert("Network Error", `Could not connect to sheets: ${error.message}`);
      setScanned(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER UI ---
  if (loadingAuth) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.title}>{isLoginMode ? 'Secure Login' : 'Create Account'}</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <View style={styles.buttonContainer}>
          <Button title={isLoginMode ? "Login" : "Sign Up"} onPress={handleAuth} />
        </View>
        <Button 
          title={isLoginMode ? "Need an account? Sign up" : "Have an account? Login"} 
          onPress={() => setIsLoginMode(!isLoginMode)} 
          type="clear"
        />
      </View>
    );
  }

  if (hasPermission === null) {
    return <View style={styles.centerContainer}><Text>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.centerContainer}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.scannerContainer}>
      {/* UPDATED: Using the new CameraView component */}
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.topBar}>
        <Text style={styles.userText}>{user.email}</Text>
        <Button title="Logout" onPress={handleLogout} color="red" />
      </View>

      {scanned && !isSubmitting && (
        <View style={styles.scanAgainButton}>
           <Button title={'Tap to Scan Again'} onPress={() => setScanned(false)} />
        </View>
      )}

      {isSubmitting && (
        <View style={styles.submittingOverlay}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.submittingText}>Saving to Sheet...</Text>
        </View>
      )}
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  scannerContainer: { 
    flex: 1, 
    flexDirection: 'column', 
    justifyContent: 'flex-end',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 10,
    borderRadius: 8,
  },
  userText: {
    fontWeight: 'bold',
  },
  scanAgainButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
  },
  submittingOverlay: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center'
  },
  submittingText: {
    marginTop: 10,
    fontWeight: 'bold'
  }
});