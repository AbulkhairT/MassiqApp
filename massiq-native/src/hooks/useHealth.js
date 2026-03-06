import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

// Safely import health packages - they require native linking
let AppleHealthKit = null;
let ExpoHealth = null;

try {
  AppleHealthKit = require('react-native-health').default;
} catch (e) {}

try {
  ExpoHealth = require('expo-health');
} catch (e) {}

const HEALTH_PERMISSIONS_IOS = {
  permissions: {
    read: [
      'Steps',
      'StepCount',
      'DistanceWalkingRunning',
      'ActiveEnergyBurned',
      'BasalEnergyBurned',
      'HeartRate',
      'RestingHeartRate',
      'HeartRateVariabilitySDNN',
      'SleepAnalysis',
      'BodyMass',
      'BodyFatPercentage',
      'LeanBodyMass',
      'BodyMassIndex',
      'Height',
      'Water',
      'MindfulSession',
      'Workout',
    ],
    write: ['Steps', 'Water', 'BodyMass'],
  },
};

export default function useHealth() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState({
    steps: 0,
    distance: 0, // meters
    activeCalories: 0,
    restingCalories: 0,
    heartRate: 0,
    restingHeartRate: 0,
    hrv: 0,
    sleepHours: 0,
    sleepQuality: null, // 'INBED' | 'ASLEEP' | 'AWAKE'
    weight: null,
    bodyFat: null,
    leanMass: null,
    water: 0, // liters
    vo2Max: null,
    workouts: [],
  });

  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'ios' && AppleHealthKit) {
      return new Promise((resolve) => {
        AppleHealthKit.initHealthKit(HEALTH_PERMISSIONS_IOS, (err) => {
          if (err) {
            console.log('HealthKit init error:', err);
            resolve(false);
          } else {
            setAuthorized(true);
            resolve(true);
          }
        });
      });
    }
    return false;
  }, []);

  const fetchTodayData = useCallback(async () => {
    if (Platform.OS !== 'ios' || !AppleHealthKit || !authorized) {
      setLoading(false);
      return;
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const options = {
      startDate: startOfDay.toISOString(),
      endDate: today.toISOString(),
    };

    const updates = {};

    // Steps
    await new Promise((resolve) => {
      AppleHealthKit.getStepCount(options, (err, result) => {
        if (!err && result?.value != null) updates.steps = Math.round(result.value);
        resolve();
      });
    });

    // Distance
    await new Promise((resolve) => {
      AppleHealthKit.getDistanceWalkingRunning(options, (err, result) => {
        if (!err && result?.value != null) updates.distance = Math.round(result.value);
        resolve();
      });
    });

    // Active calories
    await new Promise((resolve) => {
      AppleHealthKit.getActiveEnergyBurned(options, (err, results) => {
        if (!err && Array.isArray(results)) {
          updates.activeCalories = Math.round(results.reduce((s, r) => s + (r.value || 0), 0));
        }
        resolve();
      });
    });

    // Heart rate (latest)
    await new Promise((resolve) => {
      AppleHealthKit.getHeartRateSamples({ ...options, limit: 10, ascending: false }, (err, results) => {
        if (!err && Array.isArray(results) && results.length > 0) {
          updates.heartRate = Math.round(results[0].value);
        }
        resolve();
      });
    });

    // Resting HR
    await new Promise((resolve) => {
      AppleHealthKit.getRestingHeartRate(options, (err, result) => {
        if (!err && result?.value) updates.restingHeartRate = Math.round(result.value);
        resolve();
      });
    });

    // HRV
    await new Promise((resolve) => {
      AppleHealthKit.getHeartRateVariabilitySamples(options, (err, results) => {
        if (!err && Array.isArray(results) && results.length > 0) {
          const avg = results.reduce((s, r) => s + r.value, 0) / results.length;
          updates.hrv = Math.round(avg);
        }
        resolve();
      });
    });

    // Sleep (last night)
    await new Promise((resolve) => {
      const sleepStart = new Date(startOfDay);
      sleepStart.setDate(sleepStart.getDate() - 1);
      sleepStart.setHours(18, 0, 0, 0);
      AppleHealthKit.getSleepSamples({
        startDate: sleepStart.toISOString(),
        endDate: today.toISOString(),
      }, (err, results) => {
        if (!err && Array.isArray(results)) {
          const asleep = results.filter(r => r.value === 'ASLEEP' || r.value === 'CORE' || r.value === 'DEEP' || r.value === 'REM');
          const totalMs = asleep.reduce((s, r) => {
            const dur = new Date(r.endDate) - new Date(r.startDate);
            return s + dur;
          }, 0);
          updates.sleepHours = Math.round((totalMs / (1000 * 60 * 60)) * 10) / 10;
        }
        resolve();
      });
    });

    // Body weight (latest)
    await new Promise((resolve) => {
      AppleHealthKit.getLatestWeight({ unit: 'pound' }, (err, result) => {
        if (!err && result?.value) updates.weight = Math.round(result.value * 10) / 10;
        resolve();
      });
    });

    // Body fat %
    await new Promise((resolve) => {
      AppleHealthKit.getLatestBodyFatPercentage({}, (err, result) => {
        if (!err && result?.value) updates.bodyFat = Math.round(result.value * 10) / 10;
        resolve();
      });
    });

    // Lean mass
    await new Promise((resolve) => {
      AppleHealthKit.getLatestLeanBodyMass({ unit: 'pound' }, (err, result) => {
        if (!err && result?.value) updates.leanMass = Math.round(result.value * 10) / 10;
        resolve();
      });
    });

    // Water intake (liters)
    await new Promise((resolve) => {
      AppleHealthKit.getWater(options, (err, result) => {
        if (!err && result?.value != null) updates.water = Math.round(result.value * 10) / 10;
        resolve();
      });
    });

    // Workouts
    await new Promise((resolve) => {
      AppleHealthKit.getSamples({
        ...options,
        type: 'Workout',
      }, (err, results) => {
        if (!err && Array.isArray(results)) {
          updates.workouts = results.map(w => ({
            type: w.activityName,
            duration: Math.round((new Date(w.end) - new Date(w.start)) / 60000),
            calories: Math.round(w.calories || 0),
          }));
        }
        resolve();
      });
    });

    setHealthData(prev => ({ ...prev, ...updates }));
    setLoading(false);
  }, [authorized]);

  const logWater = useCallback(async (liters) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit || !authorized) return;
    AppleHealthKit.saveWater({ value: liters, date: new Date().toISOString() }, () => {});
  }, [authorized]);

  useEffect(() => {
    (async () => {
      const ok = await requestPermissions();
      if (ok) fetchTodayData();
      else setLoading(false);
    })();
  }, []);

  // Refresh every 5 minutes
  useEffect(() => {
    if (!authorized) return;
    const interval = setInterval(fetchTodayData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [authorized, fetchTodayData]);

  return { authorized, loading, healthData, refresh: fetchTodayData, logWater };
}
