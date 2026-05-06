/** Fallback motorizari (sincron cu index / garaj) — folosit daca tabelul engines nu are date. */
export const engineFallbackByModelSlug = {
        a3: [
          "BSE | 1.6L Benzina | 102 CP | 75 kW | non-FL",
          "BKD | 2.0L Diesel | 140 CP | 103 kW | FL",
        ],
        a4: [
          "ALT | 2.0L Benzina | 131 CP | 96 kW | non-FL",
          "AWX | 1.9L Diesel | 130 CP | 96 kW | non-FL",
        ],
        a6: [
          "BPJ | 2.0L Benzina | 170 CP | 125 kW | FL",
          "BMK | 3.0L Diesel | 224 CP | 165 kW | FL",
        ],
        q5: [
          "CDNC | 2.0L Benzina | 211 CP | 155 kW | non-FL",
          "CGLC | 2.0L Diesel | 170 CP | 125 kW | non-FL",
        ],
        q7: [
          "BAR | 3.6L Benzina | 280 CP | 206 kW | non-FL",
          "BUG | 3.0L Diesel | 233 CP | 171 kW | non-FL",
        ],
        "seria-1": [
          "N46B20 | 2.0L Benzina | 143 CP | 105 kW | non-FL",
          "M47D20 | 2.0L Diesel | 163 CP | 120 kW | FL",
        ],
        x5: [
          "M62B46 | 4.6L Benzina | 347 CP | 255 kW | 4.6is | non-FL",
          "M54B30 | 3.0L Benzina | 231 CP | 170 kW | FL",
          "N62B48 | 4.8L Benzina | 360 CP | 265 kW | 4.8is | FL",
          "N62B44 | 4.4L Benzina | 320 CP | 235 kW | FL",
          "M57D30TU | 3.0L Diesel | 218 CP | 160 kW | FL",
        ],
        x3: [
          "N52B30 | 3.0L Benzina | 272 CP | 200 kW | non-FL",
          "M47D20 | 2.0L Diesel | 177 CP | 130 kW | non-FL",
        ],
        "seria-3": [
          "N46B20 | 2.0L Benzina | 143 CP | 105 kW | FL",
          "M47D20 | 2.0L Diesel | 150 CP | 110 kW | FL",
          "M54B30 | 3.0L Benzina | 231 CP | 170 kW | FL",
        ],
        "bmw-e46-compact": [
          "M43B19 | 1.9L Benzina | 105 CP | 77 kW | 316ti | non-FL",
          "N42B20 | 2.0L Benzina | 116 CP | 85 kW | 316ti | FL",
          "N46B20 | 2.0L Benzina | 143 CP | 105 kW | 318ti | FL",
          "N46B20 | 2.0L Benzina | 150 CP | 110 kW | 318ti | FL",
          "M54B25 | 2.5L Benzina | 192 CP | 141 kW | 325ti | FL",
        ],
        /* E46 Cabrio pre-facelift (NFL), kit CSL look — perioada tipică 2000–2003 */
        "seria-3-e46-cabrio-nfl-csl": [
          "M52TUB25 | 2.5L Benzina | 170 CP | 125 kW | 323Ci | non-FL",
          "M54B25 | 2.5L Benzina | 192 CP | 141 kW | 325Ci | non-FL",
          "M54B30 | 3.0L Benzina | 231 CP | 170 kW | 330Ci | non-FL",
          "S54B32 | 3.2L Benzina | 343 CP | 252 kW | M3 | non-FL",
        ],
        "bmw-m2-f87": [
          "N55B30 | 3.0L Benzina | 370 CP | 272 kW | M2 | non-FL",
          "S55B30 | 3.0L Benzina | 410 CP | 301 kW | M2 Competition | FL",
          "S55B30 | 3.0L Benzina | 450 CP | 331 kW | M2 CS | FL",
        ],
        "bmw-m2-g87": [
          "S58B30 | 3.0L Benzina | 460 CP | 338 kW | M2 | non-FL",
          "S58B30 | 3.0L Benzina | 480 CP | 353 kW | M2 | FL",
        ],
        "bmw-z4-e89": [
          "N52B25 | 2.5L Benzina | 204 CP | 150 kW | 23i | non-FL",
          "N52B30 | 3.0L Benzina | 258 CP | 190 kW | 30i | non-FL",
          "N54B30 | 3.0L Benzina | 306 CP | 225 kW | 35i | non-FL",
          "N54B30 | 3.0L Benzina | 340 CP | 250 kW | 35is | non-FL",
          "N20B20 | 2.0L Benzina | 184 CP | 135 kW | 28i | FL",
          "N20B20 | 2.0L Benzina | 245 CP | 180 kW | sDrive28i | FL",
          "N55B30 | 3.0L Benzina | 306 CP | 225 kW | 35i | FL",
        ],
        "seria-5": [
          "N52B25 | 2.5L Benzina | 218 CP | 160 kW | non-FL",
          "M57D30 | 3.0L Diesel | 231 CP | 170 kW | non-FL",
        ],
        "a-class": [
          "M266 | 1.7L Benzina | 116 CP | 85 kW | non-FL",
          "OM640 | 2.0L Diesel | 140 CP | 103 kW | FL",
        ],
        "c-class": [
          "M271 | 1.8L Benzina | 156 CP | 115 kW | non-FL",
          "OM646 | 2.1L Diesel | 136 CP | 100 kW | non-FL",
        ],
        "e-class": [
          "M272 | 3.0L Benzina | 231 CP | 170 kW | non-FL",
          "OM651 | 2.1L Diesel | 170 CP | 125 kW | FL",
        ],
        glc: [
          "M274 | 2.0L Benzina | 211 CP | 155 kW | non-FL",
          "OM651 | 2.1L Diesel | 170 CP | 125 kW | non-FL",
        ],
        gle: [
          "M276 | 3.5L Benzina | 306 CP | 225 kW | non-FL",
          "OM642 | 3.0L Diesel | 258 CP | 190 kW | non-FL",
        ],
        polo: [
          "BME | 1.2L Benzina | 64 CP | 47 kW | non-FL",
          "CAYB | 1.6L Diesel | 90 CP | 66 kW | FL",
        ],
        golf: [
          "BSE | 1.6L Benzina | 102 CP | 75 kW | non-FL",
          "BKD | 2.0L Diesel | 140 CP | 103 kW | non-FL",
        ],
        passat: [
          "FSI | 2.0L Benzina | 150 CP | 110 kW | non-FL",
          "BMP | 2.0L Diesel | 140 CP | 103 kW | non-FL",
        ],
        tiguan: [
          "CAWA | 2.0L Benzina | 170 CP | 125 kW | non-FL",
          "CBAA | 2.0L Diesel | 140 CP | 103 kW | non-FL",
        ],
        touareg: [
          "AXQ | 4.2L Benzina | 310 CP | 228 kW | non-FL",
          "BAC | 2.5L Diesel | 174 CP | 128 kW | non-FL",
        ],
        fabia: [
          "BBM | 1.2L Benzina | 60 CP | 44 kW | non-FL",
          "BMS | 1.4L Diesel | 80 CP | 59 kW | FL",
        ],
        octavia: [
          "BSE | 1.6L Benzina | 102 CP | 75 kW | non-FL",
          "BKD | 2.0L Diesel | 140 CP | 103 kW | non-FL",
        ],
        superb: [
          "TSI | 1.8L Benzina | 160 CP | 118 kW | non-FL",
          "TDI | 2.0L Diesel | 170 CP | 125 kW | FL",
        ],
        karoq: [
          "CZEA | 1.5L Benzina | 150 CP | 110 kW | non-FL",
          "DFGA | 2.0L Diesel | 150 CP | 110 kW | non-FL",
        ],
        kodiaq: [
          "CZPA | 2.0L Benzina | 180 CP | 132 kW | non-FL",
          "DFGA | 2.0L Diesel | 190 CP | 140 kW | non-FL",
        ],
        clio: [
          "D4F | 1.1L Benzina | 75 CP | 55 kW | non-FL",
          "K9K | 1.5L Diesel | 90 CP | 66 kW | FL",
        ],
        megane: [
          "K4M | 1.6L Benzina | 110 CP | 81 kW | non-FL",
          "K9K | 1.5L Diesel | 110 CP | 81 kW | FL",
        ],
        captur: [
          "H5F | 1.2L Benzina | 120 CP | 88 kW | non-FL",
          "K9K | 1.5L Diesel | 90 CP | 66 kW | non-FL",
        ],
        kadjar: [
          "H5F | 1.2L Benzina | 130 CP | 96 kW | non-FL",
          "R9N | 1.6L Diesel | 130 CP | 96 kW | FL",
        ],
        austral: [
          "HR13 | 1.3L Benzina | 160 CP | 117 kW | non-FL",
          "H5Ht | 1.2L Hibrid | 200 CP | 147 kW | non-FL",
        ],
        logan: [
          "K7M | 1.6L Benzina | 87 CP | 64 kW | non-FL",
          "K9K | 1.5L Diesel | 90 CP | 66 kW | FL",
        ],
        sandero: [
          "K7M | 1.6L Benzina | 90 CP | 66 kW | non-FL",
          "K9K | 1.5L Diesel | 90 CP | 66 kW | FL",
        ],
        duster: [
          "H4M | 1.6L Benzina | 115 CP | 85 kW | non-FL",
          "K9K | 1.5L Diesel | 110 CP | 81 kW | FL",
        ],
        jogger: [
          "H4M | 1.0L Benzina | 110 CP | 81 kW | non-FL",
          "H4M ECO-G | 1.0L GPL | 100 CP | 74 kW | non-FL",
        ],
        spring: [
          "5AM | Electric | 45 CP | 33 kW | non-FL",
          "5AQ | Electric | 65 CP | 48 kW | FL",
        ],
        fiesta: [
          "Duratec | 1.2L Benzina | 82 CP | 60 kW | non-FL",
          "TDCi | 1.4L Diesel | 68 CP | 50 kW | FL",
        ],
        focus: [
          "Duratec | 1.6L Benzina | 100 CP | 74 kW | non-FL",
          "TDCi | 2.0L Diesel | 136 CP | 100 kW | FL",
        ],
        mondeo: [
          "Duratec-HE | 2.0L Benzina | 145 CP | 107 kW | non-FL",
          "TDCi | 2.0L Diesel | 140 CP | 103 kW | FL",
        ],
        kuga: [
          "EcoBoost | 1.6L Benzina | 150 CP | 110 kW | non-FL",
          "TDCi | 2.0L Diesel | 163 CP | 120 kW | FL",
        ],
        puma: [
          "EcoBoost | 1.0L Benzina | 125 CP | 92 kW | non-FL",
          "EcoBoost mHEV | 1.0L Benzina | 155 CP | 114 kW | FL",
        ],
        corsa: [
          "Z12XEP | 1.2L Benzina | 80 CP | 59 kW | non-FL",
          "Z13DTH | 1.3L Diesel | 90 CP | 66 kW | FL",
        ],
        astra: [
          "Z16XER | 1.6L Benzina | 115 CP | 85 kW | non-FL",
          "Z19DTH | 1.9L Diesel | 150 CP | 110 kW | FL",
        ],
        insignia: [
          "A20NHT | 2.0L Benzina | 220 CP | 162 kW | non-FL",
          "A20DTH | 2.0L Diesel | 160 CP | 118 kW | FL",
        ],
        mokka: [
          "A14NET | 1.4L Benzina | 140 CP | 103 kW | non-FL",
          "A17DTS | 1.7L Diesel | 130 CP | 96 kW | FL",
        ],
        crossland: [
          "EB2 | 1.2L Benzina | 110 CP | 81 kW | non-FL",
          "DV6 | 1.6L Diesel | 102 CP | 75 kW | non-FL",
        ],
        yaris: [
          "1NR-FE | 1.3L Benzina | 99 CP | 73 kW | non-FL",
          "1ND-TV | 1.4L Diesel | 90 CP | 66 kW | FL",
        ],
        corolla: [
          "1ZR-FE | 1.6L Benzina | 132 CP | 97 kW | non-FL",
          "1ND-TV | 1.4L Diesel | 90 CP | 66 kW | non-FL",
        ],
        camry: [
          "2AR-FE | 2.5L Benzina | 181 CP | 133 kW | non-FL",
          "A25A-FXS | 2.5L Hibrid | 218 CP | 160 kW | FL",
        ],
        rav4: [
          "1AZ-FE | 2.0L Benzina | 152 CP | 112 kW | non-FL",
          "2AD-FTV | 2.2L Diesel | 150 CP | 110 kW | non-FL",
        ],
        "c-hr": [
          "8NR-FTS | 1.2L Benzina | 116 CP | 85 kW | non-FL",
          "2ZR-FXE | 1.8L Hibrid | 122 CP | 90 kW | non-FL",
        ],
      };
