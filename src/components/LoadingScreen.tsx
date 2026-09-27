import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SEA_TEXT_SHADOW } from '@/components/ui/Sea';

const ANGLERS = require('../../assets/images/anglers-walking.jpg');
const SHADE_TOP = require('../../assets/images/shade-top.png');
const SHADE_RADIAL = require('../../assets/images/shade-radial.png');
const STRONG_SHADOW = { textShadowColor: 'rgba(30,20,20,0.55)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 1 } };

/** 노을 그림 + 위쪽 옅은 그림자 + 앱 이름. 로딩·시작하기 화면이 함께 쓴다 */
export function ArtBackdrop() {
  return (
    <>
      <Image source={ANGLERS} style={StyleSheet.absoluteFill} contentFit="cover" />
      <Image source={SHADE_TOP} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 300 }} contentFit="fill" />
      <View className="absolute left-0 right-0 top-[104px] items-center gap-2.5">
        <Text className="font-serif text-[46px] leading-[56px] tracking-[2px] text-[#FFF8EC]" style={SEA_TEXT_SHADOW}>짬낚고</Text>
        <Text className="text-body text-[#FFF8EC]" style={SEA_TEXT_SHADOW}>짬 내서 떠나는 워킹 낚시</Text>
      </View>
    </>
  );
}

/**
 * 앱을 켤 때 세션을 확인하는 동안 보이는 첫 화면.
 * 시스템 스플래시(안드로이드 12+)는 아이콘만 가능해서 그림은 여기서 보여준다.
 */
export function LoadingScreen() {
  return (
    <View className="flex-1 bg-navy">
      <StatusBar style="light" />
      <ArtBackdrop />
      <View className="absolute left-0 right-0 top-[44%] items-center justify-center" style={{ height: 130 }}>
        <Image source={SHADE_RADIAL} style={{ position: 'absolute', width: 460, height: 170 }} contentFit="fill" />
        <Text className="font-serif text-[20px] leading-[30px] text-white" style={STRONG_SHADOW}>"퇴근하고 짬낚고?"</Text>
        <Text className="mt-1.5 font-serif text-[20px] leading-[30px] text-[#FFE2A8]" style={STRONG_SHADOW}>"콜. 물때 딱이야."</Text>
      </View>
    </View>
  );
}
