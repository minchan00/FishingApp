// 웹 미리보기 전용 대체 모듈. 네이버 지도 SDK는 Android/iOS에서만 동작한다.
// metro.config.js가 web 번들에서 '@mj-studio/react-native-naver-map' 대신 이 파일을 쓴다.
import { forwardRef, useImperativeHandle, type PropsWithChildren } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

type MapViewProps = PropsWithChildren<{ style?: StyleProp<ViewStyle> }>;

const noop = () => {};

export const NaverMapView = forwardRef<unknown, MapViewProps>(function NaverMapView({ style }, ref) {
  useImperativeHandle(ref, () => ({
    animateCameraTo: noop,
    animateCameraBy: noop,
    animateRegionTo: noop,
    cancelAnimation: noop,
    setLocationTrackingMode: noop,
  }));
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', backgroundColor: '#0e4060' }, style]}>
      <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>🗺️ 지도는 폰 앱에서만 보여요</Text>
    </View>
  );
});

export function NaverMapMarkerOverlay() {
  return null;
}
