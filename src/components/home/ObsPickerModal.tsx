import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { OBS_LIST, type ObsStation } from '@/data/weather';
import HomeSheet, { SHEET_PLACEHOLDER } from './HomeSheet';

type Props = {
  visible: boolean;
  selected: ObsStation;
  onSelect: (obs: ObsStation) => void;
  onAutoSelect: () => void;
  onClose: () => void;
};

/** 홈 화면의 관측소(지역) 선택 시트 */
export default function ObsPickerModal({ visible, selected, onSelect, onAutoSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const filtered = OBS_LIST.filter((o) => o.name.includes(search));

  const select = (next: ObsStation) => {
    setSearch('');
    onSelect(next);
  };

  return (
    <HomeSheet visible={visible} title="🌊 지역 선택" onClose={onClose}>
      <TouchableOpacity className="bg-accent/15 border border-accent rounded-xl p-3 items-center mb-3" onPress={onAutoSelect}>
        <Text className="text-accent text-[13px] font-medium">📍 내 위치에서 가장 가까운 지역 자동 선택</Text>
      </TouchableOpacity>
      <View className="flex-row items-center bg-card border border-card-border rounded-xl px-3.5 py-2.5 mb-2.5">
        <Text className="text-[14px] text-muted">🔍</Text>
        <TextInput
          className="flex-1 text-white text-[13px] ml-2"
          placeholder="지역 이름 검색..."
          placeholderTextColor={SHEET_PLACEHOLDER}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlashList
        data={filtered}
        keyExtractor={(item) => item.code}
        extraData={selected.code}
        renderItem={({ item }) => {
          const active = selected.code === item.code;
          return (
            <TouchableOpacity
              className={`py-3.5 px-4 border-b border-white/[0.08] ${active ? 'bg-accent/[0.08]' : ''}`}
              onPress={() => select(item)}
            >
              <Text className={`text-[14px] ${active ? 'text-accent font-semibold' : 'text-white'}`}>
                {active ? '✅ ' : ''}{item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
        style={{ maxHeight: 350 }}
      />
    </HomeSheet>
  );
}
