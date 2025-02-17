class GearBase {
	// type = null
	id = null;
	quality = null;
	itemName = null;
	brand = null; // Use for Style later
	talent = null;
	core = null;
	coreTwo = null;
	coreThree = null;
	attributeOne = null;
	attributeTwo = null;
	attributeThree = null;
	mod = null;
	modTwo = null;
	filters = {
		core: null,
		coreTwo: null,
		coreThree: null,
		attributeOne: null,
		attributeTwo: null,
		attributeThree: null,
		mod: null,
		modTwo: null,
		talent: null,
	};
	constructor(gearRaw) {
		if (!gearRaw) {
			return;
		}
		// this.type = gearRaw.Type not used at the moment
		// If named do filters and bla bla
		this.id = gearRaw.index;
		this.quality = gearRaw.Quality;
		this.itemName = gearRaw["Item Name"];
		this.brand = gearRaw.Brand;
		this.filters.core = gearRaw.Core;
		this.filters.coreTwo = gearRaw["Core 2"];
		this.filters.coreThree = gearRaw["Core 3"];
		this.filters.attributeOne = gearRaw["Attribute 1"];
		this.filters.attributeTwo = gearRaw["Attribute 2"];
		this.filters.attributeThree = gearRaw["Attribute 3"];
		this.filters.mod = gearRaw.Mod;
		this.filters.modTwo = gearRaw["Mod 2"];
		this.filters.talent = gearRaw.Talent;
	}
}

class WeaponBase {
	id = null;
	// "slot" = null;
	name = null;
	"base damage" = null;
	rpm = null;
	"mag size" = null;
	quality = null;
	"optimal range" = null;
	"weapon type" = null;
	"reload speed (ms)" = null;
	hsd = null;
	variant = null;

	expertise = {
		stat: "Expertise",
		max: 21,
	};

	"core 1" = {
		stat: null,
		max: null,
	};
	"core 2" = {
		stat: null,
		max: null,
	};

	// used in encoding with id
	"attribute 1" = null;
	talent = null;
	optic = null;
	"under barrel" = null;
	magazine = null;
	muzzle = null;

	filters = {
		"core 1": null,
		"core 1 max": null,
		"core 2": null,
		"core 2 max": null,
		"attribute 1": null,
		talent: null,
		optic: null,
		"under barrel": null,
		magazine: null,
		muzzle: null,
	};

	constructor(weaponRaw) {
		if (!weaponRaw) {
			return;
		}
		this.id = weaponRaw.index;
		this["rpm"] = Number(weaponRaw["RPM"]);
		this["base damage"] = Number(weaponRaw["Base Damage"]);
		this["mag size"] = Number(weaponRaw["Mag Size"]);
		this["optimal range"] = Number(weaponRaw["Optimal Range"]);
		this["reload speed (ms)"] = Number(weaponRaw["Reload Speed (ms)"]);
		this["hsd"] = Number(weaponRaw["HSD"]);
		this["expertise"].max = 21;
		this["core 1"].max = Number(weaponRaw["Core 1 Max"]);
		this["core 2"].max = Number(weaponRaw["Core 2 Max"]);
		this["core 1"].stat = weaponRaw["Core 1"];
		this["core 2"].stat = weaponRaw["Core 2"];
		this["name"] = weaponRaw["Name"];
		this["quality"] = weaponRaw["Quality"];
		this["weapon type"] = weaponRaw["Weapon Type"];
		this["variant"] = weaponRaw["Variant"];

		this.filters = {
			"core 1": weaponRaw["Core 1"],
			"core 1 max": weaponRaw["Core 1 Max"],
			"core 2": weaponRaw["Core 2"],
			"core 2 max": weaponRaw["Core 2 Max"],
			"attribute 1": weaponRaw["Attribute 1"],
			talent: weaponRaw["Talent"],
			optic: weaponRaw["Optics"],
			"under barrel": weaponRaw["Under Barrel"],
			magazine: weaponRaw["Magazine"],
			muzzle: weaponRaw["Muzzle"],
		};
	}
}

class WeaponTalent {
	Quality = String;
	Name = String;
	"Assault Rifle" = String;
	Rifle = String;
	"Marksman Rifle" = String;
	SMG = String;
	LMG = String;
	Pistol = String;
	Shotgun = String;
	Desc = String;
	attr = String;
	val = String;
	index = Number;
}

export { WeaponTalent, GearBase, WeaponBase };

// TODO CHANGE ME
