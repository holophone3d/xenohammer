/**
 * Power management system — 2 cells distributed across shields/engines/weapons.
 * Player adjusts with Q (setting 1), W (setting 2), E (setting 3).
 */

import { POWER_MULTIPLIERS } from '../data/ships';

export type HomingMode = 'threat' | 'closest' | 'disabled';

export interface PowerSetting {
    /** Power cells allocated to the nose blaster (0-5 each cell) */
    blasterCell1: number;
    blasterCell2: number;
    leftTurretCell1: number;
    leftTurretCell2: number;
    rightTurretCell1: number;
    rightTurretCell2: number;
    leftMissileCell1: number;
    leftMissileCell2: number;
    rightMissileCell1: number;
    rightMissileCell2: number;
    /** Power to shields and engines (0-5) */
    shipPowerCell1: number;
    shipPowerCell2: number;
    leftTurretAngle: number;
    rightTurretAngle: number;
    homingMode: HomingMode;
}

// Default balanced setting from original C++ source
const DEFAULT_SETTING: PowerSetting = {
    blasterCell1: 1, blasterCell2: 1,
    leftTurretCell1: 1, leftTurretCell2: 1,
    rightTurretCell1: 1, rightTurretCell2: 1,
    leftMissileCell1: 1, leftMissileCell2: 1,
    rightMissileCell1: 1, rightMissileCell2: 1,
    shipPowerCell1: 1, shipPowerCell2: 1,
    leftTurretAngle: 135,
    rightTurretAngle: 45,
    homingMode: 'threat',
};

export class PowerPlant {
    readonly maxPowerPerCell = 5;
    settings: PowerSetting[] = [];
    currentSetting = 0;
    resourceUnits = 10;

    constructor() {
        // Initialize 3 customizable power settings
        this.settings = [
            { ...DEFAULT_SETTING },
            { ...DEFAULT_SETTING },
            { ...DEFAULT_SETTING },
        ];
    }

    getSetting(): PowerSetting {
        return this.settings[this.currentSetting];
    }

    selectSetting(index: number): void {
        if (index >= 0 && index < this.settings.length) {
            this.currentSetting = index;
        }
    }

    /** Get the damage/rate multiplier for a weapon's combined cell power */
    getWeaponMultiplier(cell1: number, cell2: number): number {
        const total = Math.min(cell1 + cell2, this.maxPowerPerCell);
        return POWER_MULTIPLIERS[total] ?? 1.0;
    }

    getBlasterMultiplier(): number {
        const s = this.getSetting();
        return this.getWeaponMultiplier(s.blasterCell1, s.blasterCell2);
    }

    getLeftTurretMultiplier(): number {
        const s = this.getSetting();
        return this.getWeaponMultiplier(s.leftTurretCell1, s.leftTurretCell2);
    }

    getRightTurretMultiplier(): number {
        const s = this.getSetting();
        return this.getWeaponMultiplier(s.rightTurretCell1, s.rightTurretCell2);
    }

    getLeftMissileMultiplier(): number {
        const s = this.getSetting();
        return this.getWeaponMultiplier(s.leftMissileCell1, s.leftMissileCell2);
    }

    getRightMissileMultiplier(): number {
        const s = this.getSetting();
        return this.getWeaponMultiplier(s.rightMissileCell1, s.rightMissileCell2);
    }

    /** Speed bonus from engine power cells */
    getEngineSpeedBonus(): number {
        const s = this.getSetting();
        const total = Math.min(s.shipPowerCell1 + s.shipPowerCell2, this.maxPowerPerCell);
        return total * 2; // 2 speed units per engine power level
    }

    /** Shield regen multiplier from shield power cells */
    getShieldRegenMultiplier(): number {
        const s = this.getSetting();
        const total = Math.min(s.shipPowerCell1 + s.shipPowerCell2, this.maxPowerPerCell);
        return POWER_MULTIPLIERS[total] ?? 1.0;
    }

    // Cell count getters for HUD power bar display
    getBlasterRateCells(): number { return this.getSetting().blasterCell1; }
    getBlasterPowerCells(): number { return this.getSetting().blasterCell2; }
    getLeftTurretRateCells(): number { return this.getSetting().leftTurretCell1; }
    getLeftTurretPowerCells(): number { return this.getSetting().leftTurretCell2; }
    getRightTurretRateCells(): number { return this.getSetting().rightTurretCell1; }
    getRightTurretPowerCells(): number { return this.getSetting().rightTurretCell2; }
    getLeftMissileRateCells(): number { return this.getSetting().leftMissileCell1; }
    getLeftMissilePowerCells(): number { return this.getSetting().leftMissileCell2; }
    getRightMissileRateCells(): number { return this.getSetting().rightMissileCell1; }
    getRightMissilePowerCells(): number { return this.getSetting().rightMissileCell2; }
    getShieldCells(): number { return this.getSetting().shipPowerCell1; }
    getEngineCells(): number { return this.getSetting().shipPowerCell2; }
}
