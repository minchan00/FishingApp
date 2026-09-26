import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/** 갤러리에서 사진 한 장을 고른다. 취소하거나 권한이 없으면 null */
export async function pickImageFromLibrary(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('알림', '갤러리 접근 권한이 필요해요.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.7,
  });
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}
