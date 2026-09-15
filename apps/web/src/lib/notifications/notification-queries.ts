"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  TestNotificationChannelInput,
  UpdateNotificationSettingsInput,
  UpsertNotificationChannelInput,
} from "@xenior/types";
import { useAuthStore } from "@/stores/auth-store";
import {
  getNotificationSettings,
  listNotifications,
  listNotificationSetup,
  testNotificationChannel,
  updateNotificationSettings,
  upsertNotificationChannel,
} from "./notification-api";

export function useNotificationSettings() {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["notifications", "settings", businessId],
    queryFn: getNotificationSettings,
    enabled: Boolean(businessId),
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useMutation({
    mutationFn: (input: UpdateNotificationSettingsInput) =>
      updateNotificationSettings(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["notifications", "settings", businessId],
      });
    },
  });
}

export function useNotificationSetup(enabled = true) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["notifications", "setup", businessId],
    queryFn: listNotificationSetup,
    enabled: Boolean(businessId) && enabled,
  });
}

export function useUpsertNotificationChannel() {
  const queryClient = useQueryClient();
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useMutation({
    mutationFn: (input: UpsertNotificationChannelInput) =>
      upsertNotificationChannel(input),
    onSuccess: async (items) => {
      queryClient.setQueryData(["notifications", "setup", businessId], items);
    },
  });
}

export function useTestNotificationChannel() {
  const queryClient = useQueryClient();
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useMutation({
    mutationFn: (input: TestNotificationChannelInput) =>
      testNotificationChannel(input),
    onSuccess: async (items) => {
      queryClient.setQueryData(["notifications", "setup", businessId], items);
    },
  });
}

export function useNotificationLog(enabled = true) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["notifications", "log", businessId],
    queryFn: () => listNotifications({ pageSize: 25 }),
    enabled: Boolean(businessId) && enabled,
  });
}
