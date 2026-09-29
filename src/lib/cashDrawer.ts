// Ouverture automatique du tiroir-caisse, branché en RJ11 derrière
// l'imprimante thermique. On parle directement à l'imprimante en USB
// (WebUSB, Chrome/Edge desktop, HTTPS obligatoire) et on lui envoie la
// commande ESC/POS standard "kick tiroir" : ESC p 0 25 250 (octets 27, 112,
// 0, 25, 250).
//
// Pas de logiciel à installer : une fois l'imprimante autorisée une première
// fois (bouton dans Paramètres), le navigateur la retrouve tout seul à
// chaque vente, sans redemander de permission.

const DRAWER_KICK_COMMAND = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
const STORAGE_KEY = 'cashDrawerUsbId';

let cachedDevice: USBDevice | null = null;

function isWebUSBSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.usb;
}

async function openAndClaim(device: USBDevice): Promise<void> {
  if (!device.opened) await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  const iface = device.configuration?.interfaces.find(i =>
    i.alternates.some(a => a.endpoints.some(e => e.direction === 'out'))
  );
  if (!iface) throw new Error('Aucune interface USB de sortie trouvée sur cette imprimante.');
  if (!iface.claimed) await device.claimInterface(iface.interfaceNumber);
}

async function getReadyDevice(): Promise<USBDevice | null> {
  if (!isWebUSBSupported()) return null;
  if (cachedDevice) {
    try {
      await openAndClaim(cachedDevice);
      return cachedDevice;
    } catch {
      cachedDevice = null;
    }
  }

  const devices = await navigator.usb!.getDevices();
  if (devices.length === 0) return null;

  const savedId = localStorage.getItem(STORAGE_KEY);
  const device = (savedId && devices.find(d => `${d.vendorId}:${d.productId}` === savedId)) || devices[0];

  await openAndClaim(device);
  cachedDevice = device;
  return device;
}

/**
 * À appeler depuis un clic (bouton "Connecter le tiroir-caisse" dans
 * Paramètres) pour autoriser l'accès USB à l'imprimante une première fois —
 * WebUSB exige un geste utilisateur pour ce choix. Ensuite, l'app retrouve
 * l'imprimante toute seule à chaque vente.
 */
export async function pairCashDrawerPrinter(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
  if (!isWebUSBSupported()) {
    return {
      success: false,
      error: "Ce navigateur ne supporte pas l'accès direct à l'imprimante (utilisez Chrome ou Edge sur ordinateur).",
    };
  }
  try {
    const device = await navigator.usb!.requestDevice({ filters: [] });
    await openAndClaim(device);
    cachedDevice = device;
    localStorage.setItem(STORAGE_KEY, `${device.vendorId}:${device.productId}`);
    return { success: true, deviceName: `USB ${device.vendorId.toString(16)}:${device.productId.toString(16)}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Windows garde l'imprimante réservée à son propre pilote dès qu'un
    // pilote d'impression normal (nécessaire pour imprimer les tickets) est
    // installé pour elle — Chrome n'a alors plus le droit d'y accéder
    // directement en USB. C'est une limitation du système, pas de l'app :
    // il faut utiliser la fonction "tiroir-caisse" du pilote lui-même.
    if (/access denied/i.test(message)) {
      return {
        success: false,
        error:
          "Windows garde cette imprimante réservée pour l'impression normale des tickets — Chrome ne peut pas s'y connecter directement en plus. Utilisez plutôt la fonction d'ouverture du tiroir intégrée au pilote de l'imprimante (Windows > Imprimantes et scanners > [votre imprimante] > Préférences d'impression, ou l'utilitaire fourni par le fabricant) : la plupart des imprimantes à tickets savent ouvrir le tiroir toutes seules à chaque impression, sans passer par cette page.",
      };
    }
    return { success: false, error: message };
  }
}

/** Vrai si une imprimante a déjà été autorisée sur ce navigateur. */
export async function hasCashDrawerPrinter(): Promise<boolean> {
  if (!isWebUSBSupported()) return false;
  try {
    const devices = await navigator.usb!.getDevices();
    return devices.length > 0;
  } catch {
    return false;
  }
}

export function forgetCashDrawerPrinter(): void {
  localStorage.removeItem(STORAGE_KEY);
  cachedDevice = null;
}

/**
 * Envoie la commande d'ouverture du tiroir-caisse. N'échoue jamais
 * bruyamment : si aucune imprimante n'est connectée/autorisée, ou si
 * l'envoi rate, on se contente d'un avertissement en console — une vente ne
 * doit jamais être bloquée par un problème de tiroir-caisse.
 */
export async function openCashDrawer(): Promise<void> {
  try {
    const device = await getReadyDevice();
    if (!device) {
      console.warn('[Tiroir-caisse] Aucune imprimante USB autorisée — à connecter depuis Paramètres.');
      return;
    }
    const iface = device.configuration?.interfaces.find(i => i.claimed);
    const endpoint = iface?.alternates[0]?.endpoints.find(e => e.direction === 'out');
    if (!endpoint) {
      console.warn("[Tiroir-caisse] Aucun endpoint USB de sortie trouvé sur l'imprimante.");
      return;
    }
    await device.transferOut(endpoint.endpointNumber, DRAWER_KICK_COMMAND);
  } catch (err) {
    console.warn('[Tiroir-caisse] Échec de l\'ouverture automatique :', err);
  }
}
