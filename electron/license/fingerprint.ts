/**
 * Hardware Fingerprint Generator
 * SyntexLegger - Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 *
 * Generates a unique hardware fingerprint for license binding.
 * Uses node-machine-id for reliable machine identification.
 */

import { machineIdSync } from 'node-machine-id';
import { createHash } from 'crypto';
import os from 'os';

/**
 * Get the machine's unique identifier
 * This is derived from the system's hardware and is persistent across reboots
 */
export function getMachineId(): string {
  try {
    // Get the machine ID using node-machine-id
    const machineId = machineIdSync(true);
    return machineId;
  } catch (error) {
    console.error('Failed to get machine ID:', error);
    // Fallback: generate a fingerprint from available system info
    return generateFallbackFingerprint();
  }
}

/**
 * Generate a fallback fingerprint from system information
 * This is less reliable but provides a fallback if node-machine-id fails
 */
function generateFallbackFingerprint(): string {
  const components: string[] = [];

  // OS info
  components.push(os.platform());
  components.push(os.arch());
  components.push(os.hostname());

  // CPU info
  const cpus = os.cpus();
  if (cpus.length > 0) {
    components.push(cpus[0].model);
    components.push(cpus.length.toString());
  }

  // Memory
  components.push(os.totalmem().toString());

  // Network interfaces (MAC addresses)
  const networkInterfaces = os.networkInterfaces();
  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    if (interfaces) {
      for (const iface of interfaces) {
        if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
          components.push(iface.mac);
          break; // Only use first valid MAC
        }
      }
    }
  }

  // Create a hash of all components
  const data = components.join('|');
  const hash = createHash('sha256').update(data).digest('hex');

  return hash;
}

/**
 * Get detailed hardware information for logging/debugging
 */
export function getHardwareInfo(): {
  platform: string;
  arch: string;
  hostname: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: string;
  primaryMac: string | null;
} {
  const cpus = os.cpus();
  const networkInterfaces = os.networkInterfaces();

  let primaryMac: string | null = null;
  for (const interfaces of Object.values(networkInterfaces)) {
    if (interfaces) {
      for (const iface of interfaces) {
        if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
          primaryMac = iface.mac;
          break;
        }
      }
    }
    if (primaryMac) break;
  }

  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    cpuModel: cpus[0]?.model || 'Unknown',
    cpuCores: cpus.length,
    totalMemory: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`,
    primaryMac
  };
}

/**
 * Verify if the current machine matches a stored fingerprint
 */
export function verifyFingerprint(storedFingerprint: string): boolean {
  const currentFingerprint = getMachineId();
  return currentFingerprint === storedFingerprint;
}

export default {
  getMachineId,
  getHardwareInfo,
  verifyFingerprint
};
