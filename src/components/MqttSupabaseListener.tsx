'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function MqttSupabaseListener() {
  const mqttClientRef = useRef<import('mqtt').MqttClient | null>(null);

  useEffect(() => {
    // Ensure this runs only in client environment
    if (typeof window === 'undefined') return;

    const DEFAULT_BROKER_URL = 'wss://697b75a1702d4c02abcc03eaffcc7fa7.s1.eu.hivemq.cloud:8884/mqtt';
    const brokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || DEFAULT_BROKER_URL;
    const username = process.env.NEXT_PUBLIC_MQTT_USERNAME;
    const password = process.env.NEXT_PUBLIC_MQTT_PASSWORD;

    let isSubscribed = true;

    // Dynamic import to handle Next.js / SSR / ESM interop cleanly
    import('mqtt').then((mqttModule) => {
      if (!isSubscribed) return;

      const connectFn = mqttModule.connect || (mqttModule.default && mqttModule.default.connect);
      if (!connectFn) {
        console.error('[MQTT-Supabase Sync] Could not find connect function in mqtt module');
        return;
      }

      console.log('[MQTT-Supabase Sync] Connecting to HiveMQ Cloud:', brokerUrl);

      const client = connectFn(brokerUrl, {
        clientId: `smartlocker-db-sync-${Math.random().toString(16).slice(2, 8)}`,
        reconnectPeriod: 3000,
        connectTimeout: 10000,
        username: username || undefined,
        password: password || undefined,
      });

      mqttClientRef.current = client;

      client.on('connect', () => {
        if (!isSubscribed || !client || !client.connected) return;
        console.log('[MQTT-Supabase Sync] Successfully connected to HiveMQ Cloud broker');
        
        // Topic pattern: lostreturn/locker/+/status
        const topicPattern = 'lostreturn/locker/+/status';
        client.subscribe(topicPattern, { qos: 1 }, (err) => {
          if (err) {
            const errMsg = (err.message || String(err)).toLowerCase();
            if (!isSubscribed || !client || !client.connected || errMsg.includes('closed') || errMsg.includes('closing')) {
              return;
            }
            console.error('[MQTT-Supabase Sync] Failed to subscribe to topic pattern:', topicPattern, err);
          } else {
            console.log('[MQTT-Supabase Sync] Subscribed to topic pattern:', topicPattern);
          }
        });
      });

      client.on('message', async (topic, message) => {
        try {
          // Topic format: lostreturn/locker/{lockerId}/status
          const topicParts = topic.split('/');
          if (topicParts.length < 4 || topicParts[0] !== 'lostreturn' || topicParts[1] !== 'locker' || topicParts[3] !== 'status') {
            return;
          }

          const lockerId = parseInt(topicParts[2], 10);
          if (isNaN(lockerId)) {
            console.warn('[MQTT-Supabase Sync] Received message on topic with invalid locker ID:', topic);
            return;
          }

          const rawPayload = message.toString().trim();
          if (!rawPayload) return;

          let payloadObj: Record<string, any> = {};
          try {
            payloadObj = JSON.parse(rawPayload);
          } catch (parseErr) {
            console.error(`[MQTT-Supabase Sync] Failed to parse JSON payload for locker #${lockerId}: "${rawPayload}"`, parseErr);
            return;
          }

          // Build update payload object with only explicitly present keys
          const updateData: {
            updated_at: string;
            door_state?: string;
            has_item?: boolean;
            solenoid?: string;
          } = {
            updated_at: new Date().toISOString(),
          };

          // Check doorState (support case-insensitive checks: doorState, doorstate, DOORSTATE)
          const doorStateVal = payloadObj.doorState ?? payloadObj.doorstate ?? payloadObj.DOORSTATE;
          if (doorStateVal !== undefined) {
            updateData.door_state = String(doorStateVal).toUpperCase();
          }

          // Check hasItem (support case-insensitive checks: hasItem, hasitem, HASITEM)
          const hasItemVal = payloadObj.hasItem ?? payloadObj.hasitem ?? payloadObj.HASITEM;
          if (hasItemVal !== undefined) {
            updateData.has_item = String(hasItemVal).toLowerCase() === 'true' || hasItemVal === true;
          }

          // Check solenoid (support case-insensitive checks: solenoid, SOLENOID)
          const solenoidVal = payloadObj.solenoid ?? payloadObj.SOLENOID;
          if (solenoidVal !== undefined) {
            updateData.solenoid = String(solenoidVal).toUpperCase();
          }

          // Execute Supabase update only if there are fields to update beyond updated_at
          if (Object.keys(updateData).length > 1) {
            console.log(`[MQTT-Supabase Sync] Updating Supabase locker #${lockerId}:`, updateData);

            const { error } = await supabase
              .from('lockers')
              .update(updateData)
              .eq('id', lockerId);

            if (error) {
              console.error(`[MQTT-Supabase Sync] Supabase update error for locker #${lockerId}:`, error);
            } else {
              console.log(`[MQTT-Supabase Sync] Successfully updated locker #${lockerId} in Supabase`);
            }
          }
        } catch (err) {
          console.error('[MQTT-Supabase Sync] Unexpected error processing message:', err);
        }
      });

      client.on('error', (err: any) => {
        if (!isSubscribed) return;
        const errMsg = (err?.message || String(err)).toLowerCase();
        if (errMsg.includes('closed') || errMsg.includes('closing')) return;
        console.error('[MQTT-Supabase Sync] Connection error:', err);
      });

      client.on('reconnect', () => {
        console.log('[MQTT-Supabase Sync] Reconnecting to MQTT broker...');
      });
    }).catch((importErr) => {
      console.error('[MQTT-Supabase Sync] Failed to import mqtt library:', importErr);
    });

    return () => {
      isSubscribed = false;
      if (mqttClientRef.current) {
        console.log('[MQTT-Supabase Sync] Disconnecting MQTT client');
        mqttClientRef.current.end(true);
        mqttClientRef.current = null;
      }
    };
  }, []);

  // Return null as this listener is non-visual
  return null;
}
