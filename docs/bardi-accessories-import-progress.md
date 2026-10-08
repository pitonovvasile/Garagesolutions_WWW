# Import accesorii Bardi — stare la 8 octombrie 2026

Sursa: https://www.bardiauto.ro/webshop/kategorialista/felszerelesi-cikkek

Catalogul local este în `assets/data/bardi-accessories.json` și conține **1.518 produse unice după cod**, 17 grupe principale și 132 subcategorii imediate. Unele produse apar în mai multe subcategorii, deci suma pozițiilor pe subcategorii poate depăși numărul de produse unice. Prețurile și stocurile dependente de cont nu sunt importate.

## Acoperire

| Grupă | Stare produse |
| --- | --- |
| Dezinfectare | 34 produse; toate cele 6 subcategorii parcurse |
| Echipamente auto obligatorii | 71 produse; toate cele 5 subcategorii parcurse |
| HIFI | 42 produse; ambele subcategorii parcurse |
| Accesorii electrice | 1.255 produse unice; 19 din 20 subcategorii au produse; „Conexiuni si pesele aferente” este parțială (496 din 682 poziții observate), iar „Sigurante” are doar schema cu 12 tipuri |
| Accesorii instalatie pe gaz | „Filtre” parțială: 96 din 122 poziții observate |
| Fitinguri-exterior | 21 produse din „Canistre”, „Adaptoare ptr stergatoare parbriz”, „Capac rezervor” și „Capac ventil”; celelalte subcategorii nu sunt încă importate |
| Celelalte 11 grupe principale | Schema este prezentă; produsele nu au fost încă importate |

Numerele din Bardi sunt observații făcute la momentul parcurgerii și se pot schimba. Nu există încă o confirmare că toate produsele din cele 17 grupe au fost importate.

## Reluare

Capturile autentificate existente sunt în `/private/tmp/bardi-accessories-captures.jsonl`. Parserul `scripts/parse-bardi-accessories-captures.mjs` extrage numele, codul, marca, atributele și categoria; `scripts/import-bardi-accessories.mjs` deduplică după cod și actualizează JSON-ul. Pagina `categorii/accesorii.html` afișează catalogul local în loturi de 48 de produse.

Pentru restul rubricii este necesară o sursă Bardi accesibilă: fie un export oficial CSV/XLSX/XML, fie o sesiune Bardi autentificată în Safari. Safari permite citirea unor liste, dar solicită periodic verificare CAPTCHA în lipsa autentificării. Accesul la fereastra Chrome ocupată de utilizator a fost respins automat.
