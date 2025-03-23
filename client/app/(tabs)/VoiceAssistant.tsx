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
    Linking
} from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { recordSpeech } from "@/functions/recordSpeech";
import * as FileSystem from 'expo-file-system';

interface Message {
    text: string;
    sender: 'user' | 'bot';
    audioUri?: string; 
    duration?: number;
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

    const handleSend = async () => {
        if (input.trim()) {
            const newMessage = { text: input, sender: 'user' as const };
            setMessages((prevMessages) => [...prevMessages, newMessage]);
            setInput('');

            try {
                const response = await fetch('http://192.168.2.68:8000/api/chat/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message: input})
                });

                const data = await response.json();
                const botMessage = data.answer || 'Sorry, I did not understand that.';

                setMessages((prevMessages) => [
                    ...prevMessages, 
                    { text: botMessage, sender: 'bot' as const } 
                ]);
            } catch (error) {
                console.error('Error communicating with backend API:', error);
                setMessages((prevMessages) => [
                    ...prevMessages, 
                    { text: 'Sorry, something went wrong.', sender: 'bot' as const }
                ]);
            }
        }
    };

    const currentSoundRef = useRef<Audio.Sound | null>(null);
const currentlyPlayingUriRef = useRef<string | null>(null);
const [isPlaying, setIsPlaying] = useState(false);

const playAudio = async (audioUri: string) => {
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
        console.error("Error playing audio:", error);
    }
};



    const toggleInputMode = () => {
        setIsVoiceMode(!isVoiceMode);
    };
    
    const calculateBubbleWidth = (duration: number) => {
        const maxWidth = 270;
        const minWidth = 70; 
        const maxDuration = 60; 
    
        return Math.min(maxWidth, minWidth + (duration / maxDuration) * (maxWidth - minWidth));
    };


    const startRecording = async () => {
        setIsRecording(true);
        setDuration(1); // Reset duration
        durationRef.current = 1; // Reset ref
        
        intervalRef.current = setInterval(() => {
            durationRef.current += 1;
            setDuration(durationRef.current);
    
            // Stop recording after 60 seconds
            if (durationRef.current >= 60) {
                stopRecording();
            }
        }, 1000);
        
        await recordSpeech(
          audioRecordingRef,
          setIsRecording,
          !!webAudioPermissionsRef.current
        );
      };
    
    const stopRecording = async () => {
        setIsRecording(false);

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    
        if (!audioRecordingRef.current) return;
    
        try {
            await audioRecordingRef.current.stopAndUnloadAsync();
            const uri = audioRecordingRef.current.getURI();
    
            if (!uri) {
                console.error("No recording URI found.");
                return;
            }
            const newMessage = { text: "Voice message", sender: 'user' as const, audioUri: uri , duration: durationRef.current};
            setMessages((prevMessages) => [...prevMessages, newMessage]);
    
            const uploadUrl = "http://192.168.2.68:8000/api/chat/";
    
            const response = await FileSystem.uploadAsync(uploadUrl, uri, {
                fieldName: "audio",
                httpMethod: "POST",
                uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            });
    
            const data = JSON.parse(response.body);
            const botMessage = data.answer || "Sorry, I did not understand that.";
    
            setMessages((prevMessages) => [
                ...prevMessages,
                { text: botMessage, sender: "bot" as const },
            ]);
        } catch (error) {
            console.error("Error processing audio:", error);
            setMessages((prevMessages) => [
                ...prevMessages,
                { text: "Sorry, something went wrong with voice processing.", sender: "bot" as const },
            ]);
        }
    };
    

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flexContainer}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.flexContainer}>
                        <ScrollView ref={scrollViewRef} style={styles.messagesContainer} contentContainerStyle={{ paddingBottom: 70 }}>
                            {messages.map((msg, index) => {
                                const words = msg.text.split(/(\s+)/); // Split text while keeping spaces
    
                                return (
                                    <View key={index} style={[styles.messageBubble, msg.sender === 'user' ? styles.userBubble : styles.botBubble]}>
                                        {msg.audioUri ? (
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
    
                        <View style={styles.inputContainer}>
                            <TouchableOpacity onPress={toggleInputMode} style={styles.modeToggle}>
                                <MaterialIcons name={isVoiceMode ? 'keyboard' : 'mic'} size={24} color='#007AFF' />
                            </TouchableOpacity>
                            {isVoiceMode ? (
                                <TouchableOpacity
                                    style={[styles.voiceInput, isRecording && styles.recording]}
                                    onPressIn={startRecording}
                                    onPressOut={stopRecording}
                                >
                                    <Text style={styles.voiceText}>Hold to Talk</Text>
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
    messagesContainer: { flex: 1, padding: 10 },
    messageBubble: { padding: 12, borderRadius: 10, marginVertical: 5, maxWidth: '80%' },
    userBubble: { backgroundColor: '#DCF8C6', alignSelf: 'flex-end' },
    botBubble: { backgroundColor: '#E2E2E2', alignSelf: 'flex-start' },
    messageText: { fontSize: 16 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderColor: '#E2E2E2', backgroundColor: '#FFF' },
    input: { flex: 1, borderColor: '#E2E2E2', borderWidth: 1, borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16, color: '#000' },
    sendButton: { backgroundColor: '#007AFF', borderRadius: 25, paddingVertical: 10, paddingHorizontal: 20 },
    sendButtonText: { color: '#FFFFFF', fontSize: 16 },
    modeToggle: { marginRight: 10 },
    voiceInput: { flex: 1, justifyContent: 'center', alignItems: 'center', borderColor: '#E2E2E2', borderWidth: 1, borderRadius: 25, padding: 10, backgroundColor: '#EEE' },
    recording: { backgroundColor: '#D9534F' },
    voiceText: { color: '#777' },
    voiceMessage: {
        padding: 2,
        borderRadius: 20,
        backgroundColor: '#DCF8C6',
        alignSelf: 'flex-end',
        justifyContent: 'center',
        alignItems: 'flex-end',
        height: 30,
    },
    voiceMessageText: {
        fontSize: 16,
        color: '#007AFF',
        textAlign: 'right'
    },

    linkText: {
        color: '#007AFF',
        textDecorationLine: 'underline',
    },
});


export default VoiceAssistant;


//no speech functions
/*import React, { useState, useRef, useEffect } from 'react';
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
    LayoutAnimation
} from 'react-native';

const VoiceAssistant: React.FC = () => {
    const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'bot' }[]>([
        { text: 'How can I help?', sender: 'bot' }
    ]);
    const [input, setInput] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);

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

    const handleSend = async () => {
        if (input.trim()) {
            const newMessage = { text: input, sender: 'user' as const };
            setMessages((prevMessages) => [...prevMessages, newMessage]);
            setInput('');

            try {
                const response = await fetch('http://192.168.2.68:8000/api/chat/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message: input })
                });

                const data = await response.json();
                const botMessage = data.answer || 'Sorry, I did not understand that.';

                setMessages((prevMessages) => [
                    ...prevMessages, 
                    { text: botMessage, sender: 'bot' as const } 
                ]);
            } catch (error) {
                console.error('Error communicating with backend API:', error);
                setMessages((prevMessages) => [
                    ...prevMessages, 
                    { text: 'Sorry, something went wrong.', sender: 'bot' as const }
                ]);
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={styles.flexContainer}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.flexContainer}>
                    
                    <ScrollView 
                            ref={scrollViewRef} 
                            style={styles.messagesContainer} 
                            contentContainerStyle={{ paddingBottom: 70 }}
                            onContentSizeChange={() => {
                                if (scrollViewRef.current) {
                                    scrollViewRef.current.scrollToEnd({ animated: false });
                                }
                            }}
                        >
                            {messages.map((msg, index) => (
                                <View 
                                    key={index}
                                    style={[
                                        styles.messageBubble, 
                                        msg.sender === 'user' ? styles.userBubble : styles.botBubble
                                    ]}
                                >
                                    <Text style={styles.messageText}>{msg.text}</Text>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                value={input}
                                onChangeText={setInput}
                                placeholder="Type your message..."
                                placeholderTextColor="#777"
                            />
                            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                                <Text style={styles.sendButtonText}>Send</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F8F8',
    },
    flexContainer: {
        flex: 1,
    },
    messagesContainer: {
        flex: 1,
        padding: 10,
    },
    messageBubble: {
        padding: 12,
        borderRadius: 10,
        marginVertical: 5,
        maxWidth: '80%',
    },
    userBubble: {
        backgroundColor: '#DCF8C6',
        alignSelf: 'flex-end',
    },
    botBubble: {
        backgroundColor: '#E2E2E2',
        alignSelf: 'flex-start',
    },
    messageText: {
        fontSize: 16,
    },
    inputContainer: {
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
        borderColor: '#E2E2E2',
        backgroundColor: '#FFF',
    },
    input: {
        flex: 1,
        borderColor: '#E2E2E2',
        borderWidth: 1,
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
        fontSize: 16,
        color: '#000',
    },
    sendButton: {
        backgroundColor: '#007AFF',
        borderRadius: 25,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    sendButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
});

export default VoiceAssistant;
*/