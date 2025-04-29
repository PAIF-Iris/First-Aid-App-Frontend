import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
    LayoutAnimation,
    Linking,
    ActivityIndicator,
    Alert,
    Dimensions
} from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { recordSpeech } from "@/functions/recordSpeech";
import * as FileSystem from 'expo-file-system';
import AsyncStorage from "@react-native-async-storage/async-storage";
import {useRouter} from 'expo-router';
import { useRoute, useNavigation } from '@react-navigation/native'; // Import hooks
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { StackNavigationProp } from '@react-navigation/stack';
import NetInfo from '@react-native-community/netinfo';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

type VoiceAssistantRouteProp = RouteProp<RootStackParamList, 'VoiceAssistant'>;

export const refreshAccessToken = async () => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
        Alert.alert("Error", "Please check your network and try again.");
        return;
    }

    const refreshToken = await AsyncStorage.getItem("refreshToken");
    const response = await fetch("http://172.105.105.81/api/token/refresh/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
    });

    const data = await response.json();
    await AsyncStorage.setItem("accessToken", data.access);
};

interface Message {
    text: string;
    sender: 'user' | 'bot';
    audioUri?: string; 
    duration?: number;
    loading?: boolean;
    id?: string;
}

const VoiceAssistant: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { text: 'How can I help?', sender: 'bot' }
    ]);
    const [input, setInput] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const audioRecordingRef = useRef(new Audio.Recording());
    const webAudioPermissionsRef = useRef<MediaStream | null>(null);
    const [duration, setDuration] = useState(0); // Track recording duration
    const durationRef = useRef(0); // Ref to store duration for cleanup
    const intervalRef = useRef<NodeJS.Timeout | null>(null); // Ref for the interval
    const [thread_Id, setThreadId] = useState<string | null>(null);
    const navigation = useNavigation();
    const route = useRoute<VoiceAssistantRouteProp>();
    const { threadId } = route.params;    
    const downloadedFiles: string[] = [];
    const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
    

    useEffect(() => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: false });
        }
    }, [messages]);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.linear);
            if (scrollViewRef.current) {
                scrollViewRef.current.scrollToEnd({ animated: true }); 
            }
        });

        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.linear); 
        });

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);


    useEffect(() => {
        const loadThread = async () => {

            if (threadId) {
                // Load existing thread messages
                await loadExistingThread(threadId);
            } else {
                // Start a new conversation if no thread specified
                await startNewConversation();
            }
        };

        loadThread();
    }, []);

 /*   useEffect(() => {
        return () => {
            Promise.all(
                downloadedFiles.map((file) => FileSystem.deleteAsync(file))
            )
            .then(() => console.log("All files deleted"))
            .catch((error) => console.error("Error deleting files:", error));
        };
    }, []);
*/
    
    //delete all downloaded files
    useEffect(() => {
        return () => {
            const cleanup = async () => {

                try {
                    
                    for (const file of downloadedFiles) {
                      try {
                        // Ensure you're using the full file URI
                        await FileSystem.deleteAsync(file, { idempotent: true });
                        
                        // Optional: Verify file deletion
                        const fileInfo = await FileSystem.getInfoAsync(file);
                      } catch (error) {
                        console.error(`Error deleting file ${file}:`, error);
                      }
                    }
                    
                    downloadedFiles.length = 0; // ✅ Clear array
                  } catch (error) {
                    console.error("Cleanup failed:", error);
                  }
            };
    
            cleanup();
        };
    }, []);

    const checkConnectionStatus = async () => {
        const state = await NetInfo.fetch();
        return state.isConnected;
      };
    

    const loadExistingThread = async (thread: string) => {
        try {

            const isConnected = await checkConnectionStatus();
            if (!isConnected) {
                Alert.alert("Error", "Please check your network and try again.");
                return;
            }
            const accessToken = await AsyncStorage.getItem("accessToken");
            const response = await fetch(`http://172.105.105.81/api/get_thread_messages/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                },
                body: JSON.stringify({ thread_id: thread })
            });

            if (response.status === 401) {
                await refreshAccessToken();
                return loadExistingThread(thread); // Retry request
            }

            const responseText = await response.text(); // Capture raw response for debugging

            const data = JSON.parse(responseText); // Parse only after confirming response is OK

            const threadMessages = data.map((msg: { content?: string; sender: string; created_at: string; audio?: string; duration?: number}) => ({
                text: msg.content || null,
                sender: msg.sender === "user" ? "user" : "bot",
                audioUri: msg.audio || null,
                duration: msg.duration || null,
                createdAt: new Date(msg.created_at).toLocaleString()
            }));


            setMessages(prevMessages => [...prevMessages, ...threadMessages]);
            setThreadId(thread)

            
            } catch (error) {
                console.error("Error loading thread messages:", error);
            }
    };
    

    const startNewConversation = async () => {
        try {
            const isConnected = await checkConnectionStatus();
            if (!isConnected) {
                Alert.alert("Error", "Please check your network and try again.");
                return;
            }

            const accessToken = await AsyncStorage.getItem("accessToken");
            const response = await fetch("http://172.105.105.81/api/start_new_conversation/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                }
            });

            if (response.status === 401) {
                // If unauthorized, refresh token and retry
                await refreshAccessToken();
                return startNewConversation();
            }

            if (response.ok) {
                const data = await response.json();
                setThreadId(data.thread_id);
                await AsyncStorage.setItem("threadId", data.thread_id);
            } else {
                console.error("Failed to start new conversation");
            }
        } catch (error) {
            console.error("Error creating new thread:", error);
        }
    };


    const handleSend = async () => {
        const isConnected = await checkConnectionStatus();
            if (!isConnected) {
                Alert.alert("Error", "Please check your network and try again.");
                return;
        }

        if (!input.trim() || isWaitingForResponse) {
            return;
        }
    
        setIsWaitingForResponse(true);

        if (input.trim()) {
            const newMessage = { text: input, sender: "user" as const };
            setMessages((prevMessages) => [...prevMessages, newMessage]);
            setInput('');

            const loadingMessage = { id: 'loading', text: '...', sender: "bot" as const, loading: true };
            setMessages((prevMessages) => [...prevMessages, loadingMessage]);
        
            const sendMessageRequest = async (retry: boolean = true) => {
                let accessToken = await AsyncStorage.getItem("accessToken");
        
                const response = await fetch("http://172.105.105.81/api/chat/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${accessToken}`, // Attach JWT
                    },
                    body: JSON.stringify({ message: input, thread_id: thread_Id }),
                });
        
                if (response.status === 401 && retry) {
                    await refreshAccessToken();
                    return sendMessageRequest(false); // Retry once after refreshing token
                }
        
                return response;
            };
    
            try {
                const response = await sendMessageRequest();
                const data = await response.json();
                const botMessage = data.answer || "Sorry, I did not understand that.";

                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        msg.id === 'loading'
                            ? { text: botMessage, sender: "bot" as const }
                            : msg
                    )
                );
    
                /*setMessages((prevMessages) => [
                    ...prevMessages,
                    { text: botMessage, sender: "bot" as const },
                ]);*/
            } catch (error) {
                console.error("Error communicating with backend API:", error);
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        msg.id === 'loading'
                            ? { text: "Sorry, something went wrong.", sender: "bot" as const }
                            : msg
                    )
                );
            } finally {
                setIsWaitingForResponse(false);
            }
        }
    };
    

    const currentSoundRef = useRef<Audio.Sound | null>(null);
    const currentlyPlayingUriRef = useRef<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

   /* const playAudio = async (audioUri: string) => {
        try {
            // If the same audio is already playing, stop and unload it
            if (currentlyPlayingUriRef.current === audioUri && isPlaying) {
                if (currentSoundRef.current) {
                    await currentSoundRef.current.stopAsync();
                    await currentSoundRef.current.unloadAsync();
                    currentSoundRef.current = null;
                    currentlyPlayingUriRef.current = null;
                    setIsPlaying(false);
                }
                return;
            }

            // Stop any currently playing audio
            if (currentSoundRef.current) {
                await currentSoundRef.current.stopAsync();
                await currentSoundRef.current.unloadAsync();
                currentSoundRef.current = null;
            }

            // Load and play the new audio
            const { sound } = await Audio.Sound.createAsync(
                { uri: audioUri },
                { shouldPlay: true }
            );

            currentSoundRef.current = sound;
            currentlyPlayingUriRef.current = audioUri;
            setIsPlaying(true);

            await sound.playAsync();

            // Cleanup when playback finishes
            sound.setOnPlaybackStatusUpdate(async (status) => {
                if (status.isLoaded && status.didJustFinish) {
                    await sound.unloadAsync();
                    currentSoundRef.current = null;
                    currentlyPlayingUriRef.current = null;
                    setIsPlaying(false);
                }
            });

        } catch (error) {
            console.error("Error playing audio:", audioUri, error);
        }
    };*/

    const playAudio = async (audioUri: string) => {
        try {
            let localUri = audioUri;

            if (currentlyPlayingUriRef.current === audioUri && isPlaying) {
                if (currentSoundRef.current) {
                    await currentSoundRef.current.stopAsync();
                    await currentSoundRef.current.unloadAsync();
                    currentSoundRef.current = null;
                    currentlyPlayingUriRef.current = null;
                    setIsPlaying(false);
                }
                return;
            }

            // Stop any currently playing audio
            if (currentSoundRef.current) {
                await currentSoundRef.current.stopAsync();
                await currentSoundRef.current.unloadAsync();
                currentSoundRef.current = null;
            }


            if (!audioUri.startsWith("file://")) {
                // If it's a remote file, download it
                const filename = audioUri.split("/").pop(); // Get filename from URL
                const localPath = `${FileSystem.cacheDirectory}${filename}`;
    
                //const fileInfo = await FileSystem.getInfoAsync(localPath);

                let fileInfo = await FileSystem.getInfoAsync(localPath);
    
                if (fileInfo.exists) {
                    localUri = localPath;
                } else {
                    const downloadResumable = FileSystem.createDownloadResumable(
                        audioUri,
                        localPath
                    );
    
                    const result = await downloadResumable.downloadAsync();

                    if (!result || !result.uri) {
                        throw new Error("Failed to download audio file.");
                    }
    
                    localUri = result.uri;
                    downloadedFiles.push(localUri);
                }
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri : localUri},
                { shouldPlay: true }
            );

            currentSoundRef.current = sound;
            currentlyPlayingUriRef.current = audioUri;
            setIsPlaying(true);
            await sound.playAsync();


            sound.setOnPlaybackStatusUpdate(async (status) => {
                if (status.isLoaded && status.didJustFinish) {
                    await sound.unloadAsync();
                    currentSoundRef.current = null;
                    currentlyPlayingUriRef.current = null;
                    setIsPlaying(false);
                }
            });

        } catch (error) {
            console.error("Error playing audio:", error);
        }
    };



    const toggleInputMode = () => {
        setIsVoiceMode(!isVoiceMode);
    };
    const { width, height } = Dimensions.get('window');
    const calculateBubbleWidth = (duration: number) => {
        const maxWidth = width/4*2.8;
        const minWidth = width/8; 
        const maxDuration = 30; 
    
        return Math.min(maxWidth, minWidth + (duration / maxDuration) * (maxWidth - minWidth));
    };


    const startRecording = async () => {
        if (isWaitingForResponse) {
            return;
        }
        let hasPermission = !!webAudioPermissionsRef.current;

        if (!hasPermission) {
        // 2. If no permission yet, request permission
        const permissionResponse = await Audio.requestPermissionsAsync();
        hasPermission = permissionResponse.status === "granted";
        }

        if (!hasPermission) {
            Alert.alert(
                "Microphone Access Required",
                "Please enable microphone access in your device settings.",
                [{ text: "OK" }]
            );
            return;
        }

        setIsRecording(true);
        setDuration(1); // Reset duration
        durationRef.current = 1; // Reset ref
        
        await recordSpeech(
          audioRecordingRef,
          setIsRecording,
          !!webAudioPermissionsRef.current
        );

        intervalRef.current = setInterval(() => {
            durationRef.current += 1;
            setDuration(durationRef.current);        
            if (durationRef.current >= 30) {
                
                stopRecording();
                return;
            }    
        }, 1000);
      };


      const stopRecording = async () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        
        setIsRecording(false);
        if (isWaitingForResponse) {
            return;
        }
        
        setIsWaitingForResponse(true);

        if (!audioRecordingRef.current) return;
        try {
            await audioRecordingRef.current.stopAndUnloadAsync();
            const uri = audioRecordingRef.current.getURI();
            if (!uri) {
                console.error("No recording URI found.");
                return;
            }
            const newMessage = { text: "Voice message", sender: "user" as const, audioUri: uri, duration: durationRef.current };
            setMessages((prevMessages) => [...prevMessages, newMessage]);

            const loadingMessage: Message = { id: 'loading', text: '...', sender: "bot" as const, loading: true };
            setMessages((prevMessages) => [...prevMessages, loadingMessage]);

            const accessToken = await AsyncStorage.getItem("accessToken");
            const uploadUrl = "http://172.105.105.81/api/chat/";
            const formData = new FormData();

            formData.append("audio", {
                uri,
                name: "recording.wav",
                type: "audio/wav",
                duration: durationRef.current,
            } as any); // Casting to satisfy TypeScript
            if (thread_Id) {
                formData.append("thread_id", thread_Id);
            }
            if (durationRef.current) {
                formData.append("duration", durationRef.current.toString());
            }

            const sendAudioRequest = async (retry: boolean = true) => {
                let accessToken = await AsyncStorage.getItem("accessToken");
    
                const response = await fetch("http://172.105.105.81/api/chat/", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                    },
                    body: formData,
                });
    
                if (response.status === 401 && retry) {
                    await refreshAccessToken();
                    return sendAudioRequest(false); // Retry once after refreshing token
                }
    
                return response;
            };
    
            const response = await sendAudioRequest();
            const data = await response.json();
            const botMessage = data.answer || "Sorry, I did not understand that.";
    
            
            setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                    msg.id === 'loading'
                        ? { text: botMessage, sender: "bot" as const }
                        : msg
                )
            );
        } catch (error) {
            console.error("Error processing audio:", error);
            
            setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                    msg.id === 'loading'
                        ? { text: "Sorry, something went wrong.", sender: "bot" as const }
                        : msg
                )
            );
        } finally {
            setIsWaitingForResponse(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flexContainer}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.flexContainer}>
                        <ScrollView ref={scrollViewRef} style={styles.messagesContainer} contentContainerStyle={{ paddingBottom: moderateScale(70) }}>
                            {messages.map((msg, index) => {
                                const messageText = msg.text || ""; // Ensure it's always a string
                                const words = messageText.split(/(\s+)/);
    
                                return (
                                    <View key={index} style={[styles.messageBubble, msg.sender === 'user' ? styles.userBubble : styles.botBubble]}>
                                        {msg.loading ? (
                                        <View style={styles.loadingContainer}>
                                            {/* You can adjust the size/color of the spinner */}
                                            <ActivityIndicator size="small" color="#555" />
                                            <Text style={styles.loadingText}>AI is typing...</Text>
                                        </View>
                                    ) : msg.audioUri ? (
                                            <TouchableOpacity
                                                onPress={() => playAudio(msg.audioUri!)}
                                                style={[
                                                    styles.voiceMessage,
                                                    { width: calculateBubbleWidth(msg.duration || 0) }, // Adjust width based on duration
                                                ]}
                                            >
                                                <Text style={styles.voiceMessageText}>🎤 {msg.duration}s</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <Text style={styles.messageText}>
                                                {words.map((word, idx) => {
                                                    const isLink = /(https?:\/\/[^\s]+)/.test(word);
                                                    return isLink ? (
                                                        <TouchableOpacity key={idx} onPress={() => Linking.openURL(word.trim())}>
                                                            <Text style={styles.linkText}>{word}</Text>
                                                        </TouchableOpacity>
                                                    ) : (
                                                        <Text key={idx}>{word}</Text>
                                                    );
                                                })}
                                            </Text>
                                        )}
                                    </View>
                                );
                            })}
                        </ScrollView>

                        <Text style={styles.subtitle}>AI make mistakes. Use responses with caution.</Text>
    
                        <View style={styles.inputContainer}>
                            <TouchableOpacity onPress={toggleInputMode} style={styles.modeToggle}>
                                <MaterialIcons name={isVoiceMode ? 'keyboard' : 'mic'} size={moderateScale(30)} color='#007AFF' />
                            </TouchableOpacity>
                            {isVoiceMode ? (
                                <TouchableOpacity
                                style={[styles.voiceInput, isRecording && styles.recording]}
                                onPress={() => {
                                  if (!isRecording && !isWaitingForResponse) {
                                    startRecording();
                                  } 
                                  if (isRecording ){
                                    stopRecording();
                                  }
                                }}
                              >
                                <Text style={styles.voiceText}>
                                  {isRecording ? "Stop Recording" : "Start Recording"}
                                </Text>
                              </TouchableOpacity>
                            ) : (
                                <TextInput
                                    style={styles.input}
                                    value={input}
                                    onChangeText={setInput}
                                    placeholder='Type your message...'
                                    placeholderTextColor='#777'
                                />
                            )}
                            {!isVoiceMode && (
                                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                                    <Text style={styles.sendButtonText}>Send</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F8F8' },
    flexContainer: { flex: 1 },
    messagesContainer: { flex: 1, padding: moderateScale(10) },
    messageBubble: { padding: moderateScale(12), borderRadius: moderateScale(10), marginVertical: moderateScale(5), maxWidth: '80%' },
    userBubble: { backgroundColor: '#DCF8C6', alignSelf: 'flex-end' },
    botBubble: { backgroundColor: '#E2E2E2', alignSelf: 'flex-start' },
    messageText: { fontSize: moderateScale(16) },
    inputContainer: { flexDirection: 'row', alignItems: 'center', padding: moderateScale(10), borderTopWidth: moderateScale(1), borderColor: '#E2E2E2', backgroundColor: '#FFF' },
    input: { flex: 1, borderColor: '#E2E2E2', borderWidth: moderateScale(1), borderRadius: moderateScale(25), paddingHorizontal: moderateScale(15), paddingVertical: moderateScale(10), fontSize: moderateScale(16), color: '#000' },
    sendButton: { backgroundColor: '#007AFF', borderRadius: moderateScale(25), paddingVertical: moderateScale(10), paddingHorizontal: moderateScale(20) },
    sendButtonText: { color: '#FFFFFF', fontSize: 16 },
    modeToggle: { marginRight: 10 },
    voiceInput: { flex: 1, justifyContent: 'center', alignItems: 'center', borderColor: '#E2E2E2', borderWidth: moderateScale(1), borderRadius: moderateScale(25), padding: moderateScale(10), backgroundColor: '#EEE' },
    recording: { backgroundColor: '#D9534F' },
    voiceText: { color: '#777' },
    voiceMessage: {
        padding: moderateScale(2),
        borderRadius: moderateScale(20),
        backgroundColor: '#DCF8C6',
        alignSelf: 'flex-end',
        justifyContent: 'center',
        alignItems: 'flex-end',
        height: moderateScale(30),
    },
    voiceMessageText: {
        fontSize: moderateScale(16),
        color: '#007AFF',
        textAlign: 'right'
    },

    linkText: {
        color: '#007AFF',
        textDecorationLine: 'underline',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: moderateScale(10),
    },
    loadingText: {
        marginLeft: moderateScale(10),
        color: '#555',
        fontSize: moderateScale(14),
        fontStyle: 'italic',
    },
    subtitle: {
        fontSize: moderateScale(14),
        color: '#666',
        marginBottom: moderateScale(10),
        textAlign: 'center',
    },
});


export default VoiceAssistant;