// ─── Vedic Astrology Calculations ─────────────────────────────────────────
// Rasi & Nakshatra derived from Date of Birth + Birth Time

export const NAKSHATRAS = [
  { name: "Ashwini",           rasi: "Mesha",             lord: "Ketu"    },
  { name: "Bharani",           rasi: "Mesha",             lord: "Shukra"  },
  { name: "Krittika",          rasi: "Mesha/Vrishabha",   lord: "Surya"   },
  { name: "Rohini",            rasi: "Vrishabha",         lord: "Chandra" },
  { name: "Mrigashira",        rasi: "Vrishabha/Mithuna", lord: "Mangala" },
  { name: "Ardra",             rasi: "Mithuna",           lord: "Rahu"    },
  { name: "Punarvasu",         rasi: "Mithuna/Karka",     lord: "Guru"    },
  { name: "Pushya",            rasi: "Karka",             lord: "Shani"   },
  { name: "Ashlesha",          rasi: "Karka",             lord: "Budha"   },
  { name: "Magha",             rasi: "Simha",             lord: "Ketu"    },
  { name: "Purva Phalguni",    rasi: "Simha",             lord: "Shukra"  },
  { name: "Uttara Phalguni",   rasi: "Simha/Kanya",       lord: "Surya"   },
  { name: "Hasta",             rasi: "Kanya",             lord: "Chandra" },
  { name: "Chitra",            rasi: "Kanya/Tula",        lord: "Mangala" },
  { name: "Swati",             rasi: "Tula",              lord: "Rahu"    },
  { name: "Vishakha",          rasi: "Tula/Vrishchika",   lord: "Guru"    },
  { name: "Anuradha",          rasi: "Vrishchika",        lord: "Shani"   },
  { name: "Jyeshtha",          rasi: "Vrishchika",        lord: "Budha"   },
  { name: "Mula",              rasi: "Dhanu",             lord: "Ketu"    },
  { name: "Purva Ashadha",     rasi: "Dhanu",             lord: "Shukra"  },
  { name: "Uttara Ashadha",    rasi: "Dhanu/Makara",      lord: "Surya"   },
  { name: "Shravana",          rasi: "Makara",            lord: "Chandra" },
  { name: "Dhanishtha",        rasi: "Makara/Kumbha",     lord: "Mangala" },
  { name: "Shatabhisha",       rasi: "Kumbha",            lord: "Rahu"    },
  { name: "Purva Bhadrapada",  rasi: "Kumbha/Meena",      lord: "Guru"    },
  { name: "Uttara Bhadrapada", rasi: "Meena",             lord: "Shani"   },
  { name: "Revati",            rasi: "Meena",             lord: "Budha"   },
];

export const RASIS = [
  "Mesha","Vrishabha","Mithuna","Karka",
  "Simha","Kanya","Tula","Vrishchika",
  "Dhanu","Makara","Kumbha","Meena",
];

export const RASI_ENGLISH = [
  "Aries","Taurus","Gemini","Cancer",
  "Leo","Virgo","Libra","Scorpio",
  "Sagittarius","Capricorn","Aquarius","Pisces",
];

export const RASI_SYMBOLS = {
  Mesha:"♈", Vrishabha:"♉", Mithuna:"♊", Karka:"♋",
  Simha:"♌", Kanya:"♍", Tula:"♎", Vrishchika:"♏",
  Dhanu:"♐", Makara:"♑", Kumbha:"♒", Meena:"♓",
};

function getMoonLongitude(date, birthTimeHours = 12) {
  const epoch   = new Date("2000-01-01T00:00:00Z");
  const diffDays = (date - epoch) / (1000 * 60 * 60 * 24) + birthTimeHours / 24;
  const moonLong = (218.32 + 13.176396 * diffDays) % 360;
  return moonLong < 0 ? moonLong + 360 : moonLong;
}

function applyAyanamsa(tropicalLong, year) {
  const ayanamsa = 23.85 + (year - 2000) * (50.3 / 3600);
  let sl = tropicalLong - ayanamsa;
  return sl < 0 ? sl + 360 : sl;
}

function parseTime(timeStr) {
  if (!timeStr) return 12;
  const [h, m] = timeStr.split(":").map(Number);
  return h + (m || 0) / 60;
}

export function calculateRasiNakshatra(dob, birthTime = "") {
  const date   = new Date(dob + "T00:00:00");
  const year   = date.getFullYear();
  const hours  = parseTime(birthTime);

  const tropicalMoon  = getMoonLongitude(date, hours);
  const siderealMoon  = applyAyanamsa(tropicalMoon, year);

  const rasiIndex      = Math.floor(siderealMoon / 30);
  const nakshatraIndex = Math.min(Math.floor(siderealMoon / 13.3333), 26);
  const nakshatra      = NAKSHATRAS[nakshatraIndex];
  const pada           = Math.floor((siderealMoon % 13.3333) / 3.3333) + 1;

  return {
    rasi:          RASIS[rasiIndex],
    rasiEnglish:   RASI_ENGLISH[rasiIndex],
    nakshatra:     nakshatra.name,
    nakshatraLord: nakshatra.lord,
    nakshatraRasi: nakshatra.rasi,
    pada,
    moonDegree:    siderealMoon.toFixed(2),
  };
}

export function getChandrastamamRasi(birthRasi) {
  const idx = RASIS.indexOf(birthRasi);
  if (idx === -1) return null;
  const ci = (idx + 7) % 12;
  return { rasi: RASIS[ci], rasiEnglish: RASI_ENGLISH[ci] };
}

export function getUpcomingChandrastamamDates(birthRasi, monthsAhead = 3) {
  const chandraRasi = getChandrastamamRasi(birthRasi);
  if (!chandraRasi) return [];

  const today      = new Date();
  const daysTotal  = monthsAhead * 30;
  const daysPerRasi = 27.3217 / 12;
  const dates = [];

  for (let d = 0; d <= daysTotal; d++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + d);

    const sm   = applyAyanamsa(getMoonLongitude(checkDate), checkDate.getFullYear());
    const rIdx = Math.floor(sm / 30);

    if (RASIS[rIdx] === chandraRasi.rasi) {
      const prev = new Date(checkDate);
      prev.setDate(checkDate.getDate() - 1);
      const smPrev    = applyAyanamsa(getMoonLongitude(prev), prev.getFullYear());
      const rIdxPrev  = Math.floor(smPrev / 30);

      if (rIdxPrev !== rIdx) {
        const endDate = new Date(checkDate);
        endDate.setDate(checkDate.getDate() + Math.floor(daysPerRasi));
        dates.push({
          start: new Date(checkDate),
          end:   endDate,
          rasi:        chandraRasi.rasi,
          rasiEnglish: chandraRasi.rasiEnglish,
        });
        d += Math.floor(daysPerRasi);
      }
    }
  }
  return dates;
}

export function formatDate(date) {
  if (typeof date === "string") date = new Date(date);
  return date.toLocaleDateString("en-IN", {
    weekday:"short", day:"numeric", month:"short", year:"numeric",
  });
}
