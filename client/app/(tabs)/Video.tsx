//video is from YouTube
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Button } from 'react-native';
import { WebView } from 'react-native-webview';

const Video = () => {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    // List of video sections with YouTube links
    const videoSections = [
        { id: 1, title: 'CPR', description: 'Learn how to perform CPR in emergency situations.', videoUrl: 'https://www.youtube.com/watch?v=BQNNOh8c8ks' },
        { id: 2, title: 'Choking', description: 'Steps to help someone who is choking.', videoUrl: 'https://www.youtube.com/embed/oHg5SJYRHA0' },
        { id: 3, title: 'Burn', description: 'First aid for burns and scalds.', videoUrl: 'https://www.youtube.com/embed/kJQP7kiw5Fk' },
        { id: 4, title: 'Bleeding', description: 'How to stop severe bleeding.', videoUrl: 'https://www.youtube.com/embed/YbJOTdZBX1g' },
        { id: 5, title: 'Sprain', description: 'Treating sprains and strains.', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ];

    // Function to handle section press
    const handleSectionPress = (videoUrl: string) => {
        setVideoUrl(videoUrl); // Set the URL to show the video in WebView
    };

    // Function to close the video modal
    const handleCloseVideo = () => {
        setVideoUrl(null); // Clear the video URL to close the modal
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>First Aid Videos</Text>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                {videoSections.map((section) => (
                    <TouchableOpacity
                        key={section.id}
                        style={styles.sectionCard}
                        onPress={() => handleSectionPress(section.videoUrl)}
                    >
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <Text style={styles.sectionDescription}>{section.description}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <Modal
                visible={!!videoUrl} // Only visible if videoUrl is set
                transparent={true}
                animationType="fade"
                onRequestClose={handleCloseVideo}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContainer}>
                        <WebView
                            source={{ uri: videoUrl || '' }}
                            style={styles.webview}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                        />
                        <Button title="Close" onPress={handleCloseVideo} />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F8F8',
        padding: 16,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
    },
    scrollContainer: {
        paddingBottom: 20,
    },
    sectionCard: {
        backgroundColor: '#FFF',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 8,
    },
    sectionDescription: {
        fontSize: 14,
        color: '#666',
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    modalContainer: {
        width: '90%',
        height: '80%',
        backgroundColor: '#FFF',
        borderRadius: 10,
        overflow: 'hidden',
        justifyContent: 'space-between',
    },
    webview: {
        flex: 1,
    },
});

export default Video;


//Can't use react-native-fs to test on Expo Go
/*import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Button } from 'react-native';
import Video from 'react-native-video'; // Used to play the video
import RNFS from 'react-native-fs'; // For accessing the local file system

interface VideoPlayerProps {
    videoUri: string;
    onClose: () => void;
  }
  
  const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUri, onClose }) => {
    return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Video
          source={{ uri: videoUri }}
          style={styles.videoPlayer}
          controls={true} // Add full controls (pause/play, etc.)
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const VideoView = () => {
  // List of video sections with titles and associated local video filenames
  const videoSections = [
    { id: 1, title: 'CPR', videoFileName: 'CPR.mp4', description: 'Learn how to perform CPR in emergency situations.' },
    { id: 2, title: 'Choking', videoFileName: 'Choking.mp4', description: 'Steps to help someone who is choking.' },
    { id: 3, title: 'Burn', videoFileName: 'Burn.mp4', description: 'First aid for burns and scalds.' },
    { id: 4, title: 'Bleeding', videoFileName: 'Bleeding.mp4', description: 'How to stop severe bleeding.' },
    { id: 5, title: 'Sprain', videoFileName: 'Sprain.mp4', description: 'Treating sprains and strains.' },
  ];

  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [videoUri, setVideoUri] = useState('');

  // Function to handle section press and open video player
  const handleSectionPress = (videoFileName: string) => {
    // Construct the local video path from the app bundle
    const localVideoUri = `${RNFS.MainBundlePath}/assets/videos/${videoFileName}`;
    setVideoUri(localVideoUri);
    setIsVideoVisible(true);
  };

  // Function to close the video player
  const closeVideo = () => {
    setIsVideoVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>First Aid Videos</Text>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {videoSections.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={styles.sectionCard}
            onPress={() => handleSectionPress(section.videoFileName)}
          >
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionDescription}>{section.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isVideoVisible && <VideoPlayer videoUri={videoUri} onClose={closeVideo} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  videoPlayer: {
    width: '100%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default VideoView;*/
