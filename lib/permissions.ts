// lib/permissions.ts — Permissions frontend miroir des règles routes/api.php
'use client';

import { useEffect, useState } from 'react';
import { getUser, Role } from '@/lib/auth';

// Mêmes règles que le middleware `role:` côté Laravel (routes/api.php)
export const PERMISSIONS = {
  planningWrite:    ['manager']            as Role[], // lignes, gabarits, départs
  vehiclesWrite:    ['manager']            as Role[], // créer/modifier/désactiver un véhicule
  driversWrite:     ['manager']            as Role[], // profil, statut, repos, scores
  driversDocuments: ['manager', 'rh']      as Role[], // documents chauffeurs
  fuelVouchersWrite:['manager']            as Role[], // demande/approbation/refus/consommation bon
  fuelConsumption:  ['manager', 'dispatcher'] as Role[], // enregistrement consommation réelle
  maintenanceWrite: ['manager']            as Role[], // plans + interventions
  incidentsReport:  ['manager', 'dispatcher'] as Role[], // signaler + actions + médias
  incidentsManage:  ['manager']            as Role[], // changer statut / supprimer
  ticketsWrite:     ['manager', 'caissier'] as Role[], // vente guichet + statut (embarquer/annuler/rembourser)
  hrManage:         ['manager', 'rh']       as Role[], // congés, disciplinaire — module /hr
  comptaWrite:      ['manager', 'comptable'] as Role[], // écritures, bons de caisse, paie — module /comptabilite
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function canRole(role: Role | undefined | null, permission: PermissionKey): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export function usePermissions() {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    setRole(getUser()?.role ?? null);
  }, []);

  return {
    role,
    can: (permission: PermissionKey) => canRole(role, permission),
  };
}
