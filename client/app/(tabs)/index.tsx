//homepage
import React, { useState, useEffect } from "react";
import {View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";

const HomePage: React.FC = () => {
    const router = useRouter();
    const [isModalVisible, setModalVisible] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState(""); // Only for registration
    const [age, setAge] = useState("");   // Only for registration
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);
    const [threads, setThreads] = useState<any[]>([]);

    useEffect(() => {
        checkIfLoggedIn();
    }, []);

    const handleLogout = async () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Yes", 
                    onPress: async () => {
                        await AsyncStorage.removeItem("accessToken");
                        await AsyncStorage.removeItem("refreshToken");                        
                        setUserName(null);
                        setModalVisible(true);
                    } 
                }
            ]
        );
    };

    const checkIfLoggedIn = async () => {
        const accessToken = await AsyncStorage.getItem("accessToken");
    
        if (accessToken) {
            setUserName("authenticated"); // Just a placeholder value to indicate login
        } else {
            setModalVisible(true); // Show login modal if token is missing
        }
    };


    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }
        setLoading(true);

        try {
            const response = await fetch('http://192.168.2.68:8000/api/login/', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            setLoading(false);

            if (response.status === 200) {
               
                    await AsyncStorage.setItem("accessToken", data.tokens.access); // Store access token
                    await AsyncStorage.setItem("refreshToken", data.tokens.refresh); // Store auth token
                    setUserName(username); // Store the email as well (optional)
                    setModalVisible(false); // Close the login modal after success
            }else {
                Alert.alert("Error", data.message);
            }
        } catch (error) {
            setLoading(false);
            Alert.alert("Error", "Something went wrong. Please try again.");
        }
    };
    


    const handleRegister = async () => {
        if (!username || !password || !name || !age) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }
        setLoading(true);

        try {
            const response = await fetch('http://192.168.2.68:8000/api/register/', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, name, age }),
            });

            const data = await response.json();
            setLoading(false);

            if (response.status === 201) {
                await AsyncStorage.setItem("accessToken", data.tokens.access);
                await AsyncStorage.setItem("refreshToken", data.tokens.refresh);
                setUserName(username);
                setModalVisible(false);

            } else {
                Alert.alert("Error", data.message);
            }
        } catch (error) {
            setLoading(false);
            Alert.alert("Error", "Something went wrong. Please try again.");
        }
    };
   
    
    


    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollView}>
                <Text style={styles.title}>AI First Aid Assistant</Text>
                <Text style={styles.subtitle}>How can we help you today?</Text>

                <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="red" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => router.push('/VoiceAssistant')}
                >
                    <Ionicons name="mic" size={24} color="#007AFF"/>
                    <Text style={styles.buttonText}>Voice Assistant</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => router.push('/Video')}
                >
                    <Ionicons name="videocam" size={24} color="#007AFF" />
                    <Text style={styles.buttonText}>Videos</Text>
                </TouchableOpacity>

                <Text style={styles.helpText}>Tap a button to get started</Text>
            </ScrollView>

            <Modal visible={isModalVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{isRegistering ? "Sign Up" : "Login"}</Text>

                        {isRegistering && (
                            <>
                                <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} placeholderTextColor="#888"/>
                                <TextInput style={styles.input} placeholder="Age" value={age} onChangeText={setAge} keyboardType="numeric"placeholderTextColor="#888"/>
                            </>
                        )}

                        <TextInput style={styles.input} placeholder="Email" value={username} onChangeText={setUsername} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#888"/>
                        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#888"/>

                        {loading ? (
                            <ActivityIndicator size="large" color="#007AFF" />
                        ) : (
                            <>
                                <TouchableOpacity style={styles.authButton} onPress={isRegistering ? handleRegister : handleLogin}>
                                    <Text style={styles.authButtonText}>{isRegistering ? "Sign Up" : "Login"}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
                                    <Text style={styles.switchText}>
                                        {isRegistering ? "Already have an account? Log in" : "No account? Sign up"}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F8F8',
    },
    scrollView: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 30,
        textAlign: 'center',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 10,
        marginBottom: 15,
        width: '80%',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        color: '#333',
        fontSize: 18,
        marginLeft: 15,
        fontWeight: '500',
    },
    helpText: {
        color: '#666',
        fontSize: 14,
        marginTop: 20,
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
        width: "80%",
        backgroundColor: "#FFF",
        padding: 20,
        borderRadius: 10,
        alignItems: "center",
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 10,
    },
    
    input: {
        width: "100%",
        padding: 10,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 5,
        marginBottom: 10,
        backgroundColor: "#fff",
    },
    authButton: {
        backgroundColor: "#007BFF",
        padding: 12,
        borderRadius: 5,
        alignItems: "center",
        width: "100%",
    },
    authButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    switchText: {
        marginTop: 10,
        color: "#007BFF",
    },

    signOutButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        padding: 10,
        backgroundColor: 'white',
        borderRadius: 50,
        elevation: 5,
    }
});

export default HomePage;