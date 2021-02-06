import {
    BehaviorSubject,
    timer
} from 'rxjs';

import {
    gearData
} from "./dataImporter";

import {
    debounce
} from "rxjs/operators";

import { WEAPON_PROP_ENUM, STATS_ENUM } from "./utils";
import DPSChartCore from "./DPSChartCore";

const stats$ = new BehaviorSubject();

class Stats {
    Offensive = {}
    Defensive = {}
    Utility = {}
    Cores = {
        Offensive: [],
        Defensive: [],
        Utility: [],
    }
    brands = {}
    cores = []
    Weapons = {
        Primary: null,
        Secondary: null,
        SideArm: null,
    }
    constructor() {

    }
}

let stats = new Stats();

const keyBy = (array, key) => (array || []).reduce((r, x) => ({ ...r, [key ? x[key] : x]: x }), {});

const statTypes = {
    'O': 'Offensive',
    'D': 'Defensive',
    'U': 'Utility',
}

class StatsService {
    brandSetBonuses = null;
    statsMapping = null;
    SHDLevels = null

    resetStats() {
        stats = new Stats();
    }

    getStats$() {
        // TODO
        // https://stackoverflow.com/questions/43043517/filter-all-null-values-from-an-observablet
        // .filter(user => user !== null).distinctUntilChanged();
        return stats$.asObservable()
            .pipe(debounce(() => timer(150)));
    }

    async updateStats(data) {
        this.resetStats()
        this.brandSetBonuses = this.brandSetBonuses || await gearData.BrandSetBonuses;
        if (!this.statsMapping) {
            const statsMapping = await gearData.StatsMapping
            this.statsMapping = this.statsMapping || keyBy(statsMapping, 'Stat');
        }

        this.addStatsFromGear(data.gear);
        this.addStatsFromSHD(data.SHDLevels);

        if (data.specialization) {
            this.addStatsFromSpecialization(data.specialization);
        }

        this.handleBrandEdgeCase(stats.brands);

        // calc weapon damage AFTER all the gear stats

        // Not my best code, but it is good enough
        for (const categoryKey in MapWeaponCategoryToIdx) {
            if (Object.hasOwnProperty.call(MapWeaponCategoryToIdx, categoryKey)) {
                const idx = MapWeaponCategoryToIdx[categoryKey];
                stats.Weapons[categoryKey] = this.setWeaponStats(data.weapons[idx], categoryKey);
                DPSChartCore.addWeaponTrace(categoryKey, stats.Weapons[categoryKey]);
            }
        }

        stats$.next(stats);
    }

    async addStatsFromGear(gearArr) {
        for (let i = 0; i < gearArr.length; i++) {
            const gear = gearArr[i];
            if (gear) {
                // Add to brands OBJ
                stats.brands[gear.brand] = stats.brands[gear.brand] || []
                stats.brands[gear.brand].push(null);
                if (gear.core) {
                    stats.Cores[statTypes[gear.core.Type]].push(gear.core.StatValue || gear.core.Max);
                }
                const keys = ['attributeOne', 'attributeTwo', 'mod',]
                for (let keyI = 0; keyI < keys.length; keyI++) {
                    const key = keys[keyI];
                    const stat = gear[key]
                    if (stat) {
                        const val = stat.StatValue || Number(stat.Max);
                        const savedVal = stats[statTypes[stat.Type]][stat.Stat] || 0;
                        stats[statTypes[stat.Type]][stat.Stat] = savedVal + val;
                    }
                }
                if (this.isEdgeCaseGear(gear)) {
                    this.handleWearableEdgeCase(gear)
                }
            }
        }

        for (const brand in stats.brands) {
            // eslint-disable-next-line
            if (stats.brands.hasOwnProperty(brand)) {
                const brandCount = stats.brands[brand].length;
                const brandBuffs = []
                for (let idx = 0; idx < brandCount; idx++) {
                    const found = this.brandSetBonuses.find(
                        b => b.Brand == `${brand}${idx}`
                    )
                    if (found) {
                        brandBuffs.push(`${found.stat} ${found.val}`);
                        const statType = this.statsMapping[found.stat].Type;
                        const prevVal = stats[statTypes[statType]][found.stat] || 0;
                        stats[statTypes[statType]][found.stat] = Number(prevVal) + Number(found.val);
                        // Horrible, TODO: Change me
                        if (found.stat1) {
                            brandBuffs.push(`${found.stat1} ${found.val1}`);
                            const statType = this.statsMapping[found.stat1].Type;
                            const prevVal = stats[statTypes[statType]][found.stat1] || 0;
                            stats[statTypes[statType]][found.stat1] = Number(prevVal) + Number(found.val1);
                        }
                    }
                }
                stats.brands[brand] = brandBuffs;
            }
        }
    }

    addStatsFromSHD(SHDLevels) {
        for (let i = 0; i < SHDLevels.length; i++) {
            const SHDLevel = SHDLevels[i];
            const val = SHDLevel.value;
            const savedVal = stats[statTypes[SHDLevel.type]][SHDLevel.name] || 0;
            stats[statTypes[SHDLevel.type]][SHDLevel.name] = savedVal + val;
        }
    }

    setWeaponStats(weapon, category) {
        const weaponStats = {
            weaponName: null,
            damageIncrease: null,
            hsd: null,
            chd: null,
            chc: null,
            weaponDamage: null,
            dmgToArmored: null,
            dmgToOutOfCover: null,
            dmgToOutOfCoverArmored: null,
            rpm: null,
            totalMagSize: null,
            dmgToOutOfCoverArmoredPerMag: null,
            reloadSpeed: null,
        };

        if (!weapon) {
            return weaponStats;
        }

        weaponStats.weaponName = weapon[WEAPON_PROP_ENUM.NAME];
        const weaponCore1 = weapon[WEAPON_PROP_ENUM.CORE_1];
        const weaponCore2 = weapon[WEAPON_PROP_ENUM.CORE_2];
        const weaponAttribute1 = weapon["attribute 1"];
        const weaponCoreType = weaponCore1.stat;
        const weaponBaseDamage = Number(
            weapon[WEAPON_PROP_ENUM.BASE_DAMAGE]
        );
        const AWD =
            stats.Cores.Offensive.length > 0
                ? stats.Cores.Offensive.reduce((a, b) => a + b)
                : 0; // All weapon damages from cores
        const weaponSpecificDamage =
            (stats.Offensive[weaponCoreType] || 0) + // Damage from the brands and SHD(?)(To test)
            (weaponCore1.StatValue || weaponCore1.max); // Get the weapon CORE 1
        const genericWeaponDamage =
            stats.Offensive[STATS_ENUM.WEAPON_DAMAGE] || 0; // SHD Levels and Walker brand

        weaponStats.damageIncrease = AWD + weaponSpecificDamage + genericWeaponDamage;

        weaponStats.hsd =
            Number(weapon.hsd) +
            this.getStatValueFromGunMods(weapon, STATS_ENUM.HEADSHOT_DAMAGE);
        weaponStats.hsd += this.getStatValueFromGunAndGear(
            weaponCore2,
            weaponAttribute1,
            stats.Offensive,
            STATS_ENUM.HEADSHOT_DAMAGE
        );

        // 25 is the innate CHD of every gun
        weaponStats.chd =
            25 +
            this.getStatValueFromGunMods(
                weapon,
                STATS_ENUM.CRITICAL_HIT_DAMAGE
            );
        weaponStats.chd += this.getStatValueFromGunAndGear(
            weaponCore2,
            weaponAttribute1,
            stats.Offensive,
            STATS_ENUM.CRITICAL_HIT_DAMAGE
        );
        weaponStats.chc =
            0 +
            this.getStatValueFromGunMods(
                weapon,
                STATS_ENUM.CRITICAL_HIT_CHANCE
            );
        weaponStats.chc += this.getStatValueFromGunAndGear(
            weaponCore2,
            weaponAttribute1,
            stats.Offensive,
            STATS_ENUM.CRITICAL_HIT_CHANCE
        );

        weaponStats.weaponDamage = this.flatWeaponDamage(
            weaponBaseDamage,
            AWD,
            weaponSpecificDamage,
            genericWeaponDamage
        );

        weaponStats.weaponDamage = this.addCHDAndOrHSDOnTopOfFlatDamage(
            weaponStats.weaponDamage,
            weaponStats.chd,
            weaponStats.hsd
        );

        weaponStats.dta = this.getStatValueFromGunAndGear(
            weaponCore2,
            weaponAttribute1,
            stats.Offensive,
            STATS_ENUM.DAMAGE_TO_ARMOR
        );
        weaponStats.dmgToArmored = this.calcDmgToArmored(weaponStats.weaponDamage, weaponStats.dta);

        weaponStats.dtooc = this.getStatValueFromGunAndGear(
            weaponCore2,
            weaponAttribute1,
            stats.Offensive,
            STATS_ENUM.DAMAGE_TO_TOC
        );
        weaponStats.dmgToOutOfCover = this.calcDmgToOutOfCover(
            weaponStats.weaponDamage,
            weaponStats.dtooc
        );

        weaponStats.dmgToOutOfCoverArmored = this.calcDmgToOutOfCover(
            weaponStats.dmgToArmored,
            weaponStats.dtooc
        );

        weaponStats.rpm = weapon[WEAPON_PROP_ENUM.RPM];
        weaponStats.totalMagSize = Number(weapon[WEAPON_PROP_ENUM.MAG_SIZE]);
        weaponStats.totalMagSize += this.getExtraMagazineSize(
            weapon[WEAPON_PROP_ENUM.MAGAZINE]
        );
        weaponStats.dmgToOutOfCoverArmoredPerMag =
            weaponStats.dmgToOutOfCoverArmored * weaponStats.totalMagSize;

        const reloadSpeedModifier = this.getReloadSpeedModifier(
            weapon[WEAPON_PROP_ENUM.MAGAZINE],
            stats.Offensive[STATS_ENUM.RELOAD_SPEED_PERC]
        );
        weaponStats.reloadSpeed = this.calcReloadSpeed(
            weapon[WEAPON_PROP_ENUM.RELOAD_SPEED],
            reloadSpeedModifier
        );

        console.log(category, weaponStats);

        return weaponStats;
    }

    edgeCaseGear = ["Acosta's Go-Bag"]
    isEdgeCaseGear(gear) {
        return this.edgeCaseGear.includes(gear.itemName);
    }

    handleWearableEdgeCase(gear) {
        switch (this.edgeCaseGear.indexOf(gear.itemName)) {
            case 0:
                stats.brands['Exotic'][1] = 'Repair Skills  +10%';
                stats.brands['Exotic'][2] = 'Status Effects +10%';
                addValueToStat(stats.Utility, 'Status Effects', 10)
                addValueToStat(stats.Utility, 'Repair Skills', 10)
                break;
            default:
                break;
        }
    }

    edgeCaseBrands = ['Empress International']
    handleBrandEdgeCase(brands) {
        for (let i = 0; i < this.edgeCaseBrands.length; i++) {
            const edgeCaseBrand = this.edgeCaseBrands[i];
            if (brands[edgeCaseBrand]) {
                switch (edgeCaseBrand) {
                    case 'Empress International':
                        if (brands[edgeCaseBrand].length > 2) {
                            const skillEfficencyBuffs = ['Status Effects', 'Repair Skills', 'Skill Damage', 'Skill Health', 'Skill Haste']
                            skillEfficencyBuffs.forEach((val) => {
                                addValueToStat(stats.Utility, val, 10)
                            })
                        }
                        break;
                    default:
                        break;
                }
            }
        }
    }

    addStatsFromSpecialization(specialization) {
        // if there is a specialization, add +15 to all weapons
        [
            'Assault Rifle Damage',
            'LMG Damage',
            'Marksman Rifle Damage',
            'Pistol Damage',
            'Rifle Damage',
            'Shotgun Damage',
            'SMG Damage'
        ].forEach((dmg) => {
            addValueToStat(stats.Offensive, dmg, 15)
        })

        if (specialization.name.includes('Technician')) {
            stats.Cores.Utility.push(1)
            if (specialization.name.includes('Damage')) {
                addValueToStat(stats.Utility, 'Skill Damage', 10)
            } else {
                addValueToStat(stats.Utility, 'Repair Skills', 10)
            }
        }
    }

    flatWeaponDamage(
        weaponBaseDamage,
        AWD,
        weaponSpecificDamage,
        genericWeaponDamage
    ) {
        return (
            weaponBaseDamage *
            (1 + (AWD + weaponSpecificDamage + genericWeaponDamage) / 100)
        ).toFixed(0);
    }
    calcDmgToArmored(flatDamage, DTA) {
        return (flatDamage * (1 + DTA / 100)).toFixed(0);
    }
    calcDmgToOutOfCover(flatDamage, DTOOC) {
        return (flatDamage * (1 + DTOOC / 100)).toFixed(0);
    }
    getStatValueFromGunAndGear(
        weaponCore2,
        weaponAttribute1,
        statsObj,
        statName
    ) {
        let value = statsObj[statName] || 0;
        if (weaponCore2 && weaponCore2.stat === statName) {
            value += weaponCore2.StatValue || Number(weaponCore2.max);
        }
        if (weaponAttribute1 && weaponAttribute1.Stat === statName) {
            value += weaponAttribute1.StatValue || Number(weaponAttribute1.Max);
        }
        return value;
    }
    getStatValueFromGunMods(weapon, statName) {
        let value = 0;
        const modSlots = ["optic", "under barrel", "magazine", "muzzle"];
        modSlots.forEach((mod) => {
            const modEl = weapon[mod];
            if (!modEl) {
                return;
            }
            if (modEl.neg === statName) {
                value += Number(modEl.valNeg);
            }
            if (modEl.pos === statName) {
                value += Number(modEl.valPos);
            }
        });
        return value;
    }
    addCHDAndOrHSDOnTopOfFlatDamage(flatDamage, chd, hsd) {
        let toAdd = 0;
        toAdd += this.toggleHSD ? Number(hsd) : 0;
        toAdd += this.toggleCHD ? Number(chd) : 0;
        // (1 + CHC * CHD + HsD * headshot chance)
        return (flatDamage * (1 + toAdd / 100)).toFixed(0);
    }

    // TODO: Add Stats Modifiers
    getExtraMagazineSize(magazine) {
        if (!magazine) {
            return 0;
        } else if (magazine.pos == "Extra Rounds") {
            return Number(magazine.valPos);
        }
        return 0;
    }

    calcReloadSpeed(weapReloadSpeed, reloadSpeedModifier) {
        let reloadSpeedBase = weapReloadSpeed;
        return reloadSpeedBase / (1 + reloadSpeedModifier / 100);
    }

    // TODO: Add Stats Modifiers
    getReloadSpeedModifier(magazine, statsReloadSpeed) {
        let modifier = statsReloadSpeed || 0;
        if (!magazine) {
            // boh
        } else if (magazine.pos == "Reload Speed %") {
            modifier += Number(magazine.valPos);
        } else if (magazine.neg == "Reload Speed %") {
            modifier += Number(magazine.valNeg);
        }
        return modifier;
    }
}

const MapWeaponCategoryToIdx = {
    Primary: 0,
    Secondary: 1,
    SideArm: 2,
}


function addValueToStat(statToIncrease, key, value) {
    statToIncrease[key] = statToIncrease[key] ? statToIncrease[key] + value : value;
}


const statsService = new StatsService();

export default statsService;