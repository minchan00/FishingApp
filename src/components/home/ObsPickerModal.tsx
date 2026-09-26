import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { BottomSheet } from '@/components/ui/Sheet';
import { OBS_LIST, type ObsStation } from '@/data/weather';
import { colors } from '@/theme/colors';

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
    <BottomSheet visible={visible} title="지역 선택" onClose={onClose}>
      <Button
        label="내 위치에서 가장 가까운 지역 자동 선택"
        variant="secondary"
        size="md"
        icon="navigation"
        onPress={onAutoSelect}
        className="mb-3"
      />
      <ObsSearchField value={search} onChangeText={setSearch} />
      <FlashList
        data={filtered}
        keyExtractor={(item) => item.code}
        extraData={selected.code}
        renderItem={({ item }) => {
          const active = selected.code === item.code;
          return (
            <ListRow
              title={item.name}
              onPress={() => select(item)}
              chevron={false}
              right={active ? <Icon name="check" size={20} color={colors.primary} /> : undefined}
            />
          );
        }}
        style={{ maxHeight: 350 }}
      />
    </BottomSheet>
  );
}

/** 지역 이름 검색 입력칸 (돋보기 아이콘 포함). 일자별 예보 모달의 지역 선택에서도 쓴다 */
export function ObsSearchField({ value, onChangeText, autoFocus }: { value: string; onChangeText: (v: string) => void; autoFocus?: boolean }) {
  return (
    <View className="mb-2 h-[44px] flex-row items-center rounded-field bg-surface px-3.5">
      <Icon name="search" size={18} color={colors.mute} />
      <TextInput
        className="ml-2 flex-1 text-body text-ink"
        placeholder="지역 이름 검색..."
        placeholderTextColor={colors.mute}
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
      />
    </View>
  );
}
