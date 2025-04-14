import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomePage from './app/(tabs)/index';
import VoiceAssistant from './app/(tabs)/VoiceAssistant';
import { RootStackParamList } from './types';
import Toast from 'react-native-toast-message';

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
    
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="HomePage" component={HomePage} />
                <Stack.Screen name="VoiceAssistant" component={VoiceAssistant} />
            </Stack.Navigator>
            <Toast />
        </NavigationContainer>
    );
};

export default App;

