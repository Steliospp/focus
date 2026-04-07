import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  LayoutAnimation,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "../store/useAppStore";
import { fonts } from "../constants/fonts";
import { theme } from "../theme";

const PRESET_COLORS = [
  "#F97316", "#3B82F6", "#A855F7", "#10B981",
  "#EF4444", "#EC4899", "#6366F1", "#14B8A6",
  "#78716C", "#F59E0B", "#84CC16", "#06B6D4",
];

export function ListSettingsScreen() {
  const navigation = useNavigation();
  const { contexts, addContext, updateContext, removeContext } = useAppStore();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addContext({
      id: `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: newName.trim().toLowerCase(),
      color: newColor,
    });
    setNewName("");
    setShowAdd(false);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const handleRemove = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    removeContext(id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>contexts</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.description}>
        contexts are colored dots that group your tasks. think of them as projects
        or areas of your life.
      </Text>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {contexts.map((ctx) => (
          <View key={ctx.id} style={styles.contextRow}>
            <View style={[styles.dot, { backgroundColor: ctx.color }]} />
            <Text style={styles.contextName}>{ctx.name}</Text>
            {ctx.isDefault && (
              <Text style={styles.defaultBadge}>default</Text>
            )}
            {!ctx.isDefault && (
              <TouchableOpacity
                onPress={() => handleRemove(ctx.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={20} color={theme.colors.text.muted} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Add new */}
        {showAdd ? (
          <View style={styles.addForm}>
            <TextInput
              style={styles.addInput}
              placeholder="context name"
              placeholderTextColor={theme.colors.text.muted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              autoCapitalize="none"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    newColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setNewColor(color)}
                />
              ))}
            </ScrollView>
            <View style={styles.addActions}>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelText}>cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                <Text style={styles.addBtnText}>add</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addContextBtn}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowAdd(true);
            }}
          >
            <Ionicons name="add" size={18} color={theme.colors.accent} />
            <Text style={styles.addContextText}>add context</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: theme.colors.text.primary,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: theme.colors.text.secondary,
    paddingHorizontal: 20,
    marginBottom: 20,
    lineHeight: 20,
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  contextName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
    color: theme.colors.text.primary,
    flex: 1,
  },
  defaultBadge: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: theme.colors.text.muted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  addForm: {
    marginTop: 16,
    gap: 12,
  },
  addInput: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  colorRow: {
    flexDirection: "row",
  },
  colorOption: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: theme.colors.text.primary,
  },
  addActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cancelText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: theme.colors.text.muted,
  },
  addBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.accent,
  },
  addBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: "#fff",
  },
  addContextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
  },
  addContextText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: theme.colors.accent,
  },
});
