import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Button, ActivityIndicator, Dimensions } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { VideoView, useVideoPlayer} from 'expo-video';  // 👉 Import Video from expo-video
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

type VideoSection = {
  id: number;
  title: string;
  description: string;
  remoteUrl: string;
  localUri?: string;
};

const Videos = () => {
  const [videoSections, setVideoSections] = useState<VideoSection[]>([
    {
      id: 1,
      title: 'CPR',
      description: 'CPR on cardiac arrest patients.',
      remoteUrl: 'http://172.105.105.81/videos/AdultCPR.mp4',
    },
    {
      id: 2,
      title: 'Choking',
      description: 'Perform J-thrust on youth and adults.',
      remoteUrl: 'http://172.105.105.81/videos/Choking.mp4',
    },
    {
      id: 3,
      title: 'Self-Choking',
      description: 'Save yourself when you are alone and choking.',
      remoteUrl: 'http://172.105.105.81/videos/SelfChoking.mp4',
    },
  ]);

  const [selectedVideoUri, setSelectedVideoUri] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Download all videos on mount
  useEffect(() => {
    const downloadAllVideos = async () => {
      setIsDownloading(true);
      const updatedSections = await Promise.all(
        videoSections.map(async (section) => {
          const fileUri = `${FileSystem.documentDirectory}${section.title.replace(/\s/g, '')}.mp4`;
          const fileInfo = await FileSystem.getInfoAsync(fileUri);

          if (!fileInfo.exists) {
            try {
              await FileSystem.downloadAsync(section.remoteUrl, fileUri);
              console.log(`Downloaded ${section.title}`);
            } catch (err) {
              console.error(`Failed to download ${section.title}:`, err);
              return section; // return without localUri
            }
          }

          return { ...section, localUri: fileUri };
        })
      );
      setVideoSections(updatedSections);
      setIsDownloading(false);
    };

    downloadAllVideos();
  }, []);

  const handleSectionPress = (uri: string | undefined) => {
    if (uri) setSelectedVideoUri(uri);
  };

  const handleCloseVideo = () => {
    setSelectedVideoUri(null);
  };

  const player = useVideoPlayer(selectedVideoUri, (player) => {
    player.loop = true;
    player.play();
  });

  return (
    <View style={styles.container}>
      <Text style={styles.header}>First Aid Videos</Text>
      <Text style={styles.subtitle}>Disclaimer: These videos are for guidance purposes only and do not replace professional advice.</Text>

      {isDownloading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 30 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {videoSections.map((section) => (
            <TouchableOpacity
              key={section.id}
              style={styles.sectionCard}
              onPress={() => handleSectionPress(section.localUri)}
              disabled={!section.localUri}
            >
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionDescription}>{section.description}</Text>
              {!section.localUri && <Text style={styles.downloadingText}>Downloading...</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {selectedVideoUri && (
        <View style={styles.fullScreenContainer}>
            {selectedVideoUri && (
              <VideoView style={styles.video} player={player} allowsFullscreen allowsPictureInPicture />
            )}
            <Button title="Close" onPress={handleCloseVideo} />
          </View>
      )}
    </View>
  );
};
const { width, height } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8', padding: moderateScale(16) },
  header: { fontSize: scale(24), fontWeight: 'bold', color: '#333', marginBottom: verticalScale(10) },
  scrollContainer: { paddingBottom: verticalScale(20) },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: moderateScale(10),
    padding: moderateScale(16),
    marginBottom: verticalScale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    elevation: moderateScale(3),
  },
  sectionTitle: {
    fontSize: scale(18),
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: verticalScale(8),
  },
  sectionDescription: {
    fontSize: scale(14),
    color: '#666',
  },
  downloadingText: {
    fontSize: scale(12),
    color: '#999',
    marginTop: verticalScale(5),
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  subtitle: {
    fontSize: scale(10),
    color: '#666',
    marginBottom: verticalScale(30),
    textAlign: 'left',
  },
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: width-10,
    height: height-10,
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Background overlay to darken behind video
    top: 5,
    left: 5
  },
});

export default Videos;