/* =========================================================================
   Merz Product Expert — Demo data layer
   All content below is FICTIONAL demo data modelled on the look of approved
   Merz sources. It is not real medical or promotional information and exists
   only to make the prototype behave like a working product.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- products */
  const PRODUCTS = {
    xeomin: {
      id: 'xeomin', name: 'Xeomin', code: 'NTX', letter: 'X',
      category: 'Neurotoxin', cat2: 'NEUROTOXIN · NTX',
      color: 'var(--p1)', bg: 'var(--p1-bg)', reviewed: '3 Jul',
      spark: 'What is the onset time for Xeomin?'
    },
    belotero: {
      id: 'belotero', name: 'Belotero', code: 'HA', letter: 'B',
      category: 'HA Filler', cat2: 'HA FILLER · HA',
      color: 'var(--p2)', bg: 'var(--p2-bg)', reviewed: '7 Jul',
      portfolio: true, spark: 'Which Belotero for tear troughs?'
    },
    radiesse: {
      id: 'radiesse', name: 'Radiesse', code: 'CaHA', letter: 'R',
      category: 'Biostimulator', cat2: 'BIOSTIMULATOR · CAHA',
      color: 'var(--p3)', bg: 'var(--p3-bg)', reviewed: '28 Jun',
      spark: 'Can Radiesse be diluted for skin quality?'
    },
    ultherapy: {
      id: 'ultherapy', name: 'Ultherapy', code: 'MFU', letter: 'U',
      category: 'Ultrasound Lift', cat2: 'ULTRASOUND LIFT · MFU',
      color: 'var(--p4)', bg: 'var(--p4-bg)', reviewed: '28 Jun',
      spark: 'How many Ultherapy sessions are needed?'
    }
  };

  const CATEGORIES = [
    'Product overview',
    'Dosing & reconstitution',
    'Contraindications & safety',
    'Handle an objection',
    'Compare approved claims'
  ];

  /* Suggested questions surfaced per category on Home */
  const CATEGORY_QUESTIONS = {
    'Product overview': [
      'Tell me about Belotero',
      'What is Radiesse used for?',
      'Give me an overview of Xeomin',
      'What does Ultherapy treat?'
    ],
    'Dosing & reconstitution': [
      'How should Xeomin be reconstituted?',
      'What dilution options are approved for Radiesse?',
      'How long can reconstituted Xeomin be stored?',
      'What are the recommended dosing ranges for Belotero Soft?'
    ],
    'Contraindications & safety': [
      'What are the contraindications for Radiesse?',
      'Can Xeomin and Belotero be used in the same session?',
      'What are the contraindications for Xeomin?',
      'Is Radiesse suitable for patients over 65?'
    ],
    'Handle an objection': [
      'A doctor says Radiesse is too painful — how do I respond?',
      'How do I handle "your filler is more expensive"?',
      'HCP prefers a competitor neurotoxin — what are the approved points?'
    ],
    'Compare approved claims': [
      'Compare the Belotero products',
      'Xeomin vs other neurotoxins — approved claims',
      'Radiesse vs other biostimulators'
    ]
  };

  /* ------------------------------------------------------------ knowledge base
     Each entry: an approved-source-backed answer the assistant can return.
     mode content: hcp (conversation guidance) and rep (technical detail).     */
  const KB = [
    {
      id: 'bel-overview', product: 'belotero', category: 'Product overview',
      q: 'Tell me about Belotero', market: 'UAE', portfolio: true,
      keywords: ['tell me about belotero', 'belotero overview', 'about belotero', 'what is belotero'],
      scope: 'Belotero portfolio',
      hcp: {
        lead: 'Belotero is a portfolio of hyaluronic acid dermal fillers designed for different aesthetic treatment objectives. Each product in the range has its own properties, approved indications and recommended injection approach, so the appropriate choice depends on the treatment area and the locally approved label.',
        points: [
          { text: 'Belotero is a <b>portfolio rather than a single filler</b>, with products intended for different treatment objectives and tissue depths.', src: 1 },
          { text: 'Product selection should be based on the <b>specific treatment area, patient need and locally approved indication</b>.', src: 2 },
          { text: 'For product-specific questions, select the individual Belotero product before discussing injection technique, treatment area or expected outcome.', src: 3 }
        ],
        note: '<b>Portfolio-level answer:</b> this response intentionally avoids applying a claim from one Belotero product to the entire range. Ask a product-specific follow-up for Belotero Balance, Soft, Intense or Volume.'
      },
      rep: {
        lead: 'The Belotero range is built on Cohesive Polydensified Matrix (CPM) technology. Individual products differ in HA concentration, cohesivity and lift capacity, which is why each carries its own approved indication and injection depth.',
        points: [
          { text: 'Belotero <b>Soft</b>: superficial fine lines; Belotero <b>Balance</b>: moderate lines and lips; Belotero <b>Intense</b>: deeper folds and volume; Belotero <b>Volume</b>: deep volumising.', src: 1 },
          { text: 'CPM technology aims for <b>even tissue integration</b> at the intended injection depth.', src: 3 },
          { text: 'Always confirm the <b>locally approved indication and depth</b> for the specific product before detailing technique.', src: 2 }
        ],
        note: '<b>Rep detail view</b> is for your own preparation. Do not read HA concentrations or matrix claims to an HCP unless they appear in the locally approved label.'
      },
      sources: [
        { n: 1, perm: 'int', title: 'Belotero Portfolio Overview', meta: 'Market: UAE · Product guide · Effective 3 Jul 2026 · Page 4', excerpt: 'The Belotero range includes multiple hyaluronic acid filler products developed for different aesthetic treatment objectives.', doc: 'Open document' },
        { n: 2, perm: 'hcp', title: 'Belotero UAE Product Information', meta: 'Market: UAE · Local label · Effective 1 Jun 2026 · Page 2', excerpt: 'Indications, administration guidance and precautions are product-specific and should be interpreted according to the locally approved information.', doc: 'Open local label' },
        { n: 3, perm: 'int', title: 'Belotero Product Selection Guide', meta: 'Market: MENA · Internal training · Effective 18 Jun 2026 · Page 7', excerpt: 'Product-specific discussion should begin by clarifying the treatment area, objective and relevant Belotero product.', doc: 'Open training material' }
      ],
      followups: ['Compare the Belotero products', 'Show indications by product', 'What are the contraindications?', 'Which product is used for fine lines?']
    },

    {
      id: 'bel-tear-troughs', product: 'belotero', category: 'Product overview',
      q: 'Which Belotero for tear troughs?', market: 'UAE',
      keywords: ['tear trough', 'belotero tear', 'under eye belotero', 'infraorbital'],
      scope: 'Belotero portfolio',
      hcp: {
        lead: 'Product selection for the tear trough should follow the locally approved indication for the specific Belotero product and the treating physician\'s assessment. The tear trough is an advanced area, so the choice of product and depth should be confirmed against the approved label.',
        points: [
          { text: 'Belotero <b>Balance</b> is generally positioned for moderate correction; the tear trough is an <b>advanced, physician-dependent area</b>.', src: 1 },
          { text: 'Confirm the <b>approved indication and injection depth</b> in the UAE label before discussing technique.', src: 2 }
        ],
        note: '<b>Advanced area:</b> keep the discussion to approved indications. Injection technique for periorbital areas is a physician clinical decision.'
      },
      sources: [
        { n: 1, perm: 'int', title: 'Belotero Product Selection Guide', meta: 'Market: MENA · Internal training · Effective 18 Jun 2026 · Page 9', excerpt: 'Selection for periorbital correction should be based on the approved indication and the physician\'s assessment of tissue and depth.', doc: 'Open training material' },
        { n: 2, perm: 'hcp', title: 'Belotero UAE Product Information', meta: 'Market: UAE · Local label · Effective 1 Jun 2026 · Page 3', excerpt: 'Injection depth and indication are product-specific and defined in the locally approved information.', doc: 'Open local label' }
      ],
      followups: ['Compare the Belotero products', 'What are the contraindications?', 'Which product is used for fine lines?']
    },

    {
      id: 'bel-soft-dosing', product: 'belotero', category: 'Dosing & reconstitution',
      q: 'What are the recommended dosing ranges for Belotero Soft?', market: 'UAE',
      keywords: ['belotero soft dosing', 'belotero soft dose', 'soft dosing range', 'dosing belotero soft'],
      scope: 'Belotero Soft',
      hcp: {
        lead: 'Belotero Soft is intended for superficial injection to treat fine lines. The volume used is determined by the treatment area and the physician\'s assessment, within the locally approved indication.',
        points: [
          { text: 'Belotero Soft is for <b>fine, superficial lines</b>; it is injected into the superficial dermis.', src: 1 },
          { text: 'Injected volume is <b>individualised</b> to the area and patient; refer to the approved label for administration guidance.', src: 2 }
        ]
      },
      sources: [
        { n: 1, perm: 'int', title: 'Belotero Portfolio Overview', meta: 'Market: UAE · Product guide · Effective 3 Jul 2026 · Page 6', excerpt: 'Belotero Soft is developed for superficial injection to treat fine lines.', doc: 'Open document' },
        { n: 2, perm: 'hcp', title: 'Belotero UAE Product Information', meta: 'Market: UAE · Local label · Effective 1 Jun 2026 · Page 4', excerpt: 'The quantity injected depends on the site to be treated. Refer to administration guidance.', doc: 'Open local label' }
      ],
      followups: ['Compare the Belotero products', 'Tell me about Belotero', 'What are the contraindications?']
    },

    {
      id: 'bel-layering-lip', product: 'belotero', category: 'Product overview',
      q: 'Belotero layering technique for lip definition', market: 'UAE',
      keywords: ['belotero layering', 'lip definition', 'layering technique', 'lip belotero'],
      scope: 'Belotero portfolio',
      hcp: {
        lead: 'Layering and injection technique for lip definition are clinical decisions for the treating physician. From an approved-content perspective, the discussion should stay on which Belotero products carry a lip indication and their intended depth.',
        points: [
          { text: 'Belotero <b>Balance</b> is positioned for lip treatment within its approved indication.', src: 1 },
          { text: 'Specific <b>layering technique is a physician clinical decision</b> and is not part of approved promotional content.', src: 2 }
        ],
        note: '<b>Technique boundary:</b> the assistant will not generate injection technique. Keep the HCP conversation to approved indication and product choice.'
      },
      sources: [
        { n: 1, perm: 'hcp', title: 'Belotero UAE Product Information', meta: 'Market: UAE · Local label · Effective 1 Jun 2026 · Page 3', excerpt: 'Indications for each product are defined in the locally approved information.', doc: 'Open local label' },
        { n: 2, perm: 'int', title: 'Belotero Product Selection Guide', meta: 'Market: MENA · Internal training · Effective 18 Jun 2026 · Page 11', excerpt: 'Injection technique is a clinical decision and is outside the scope of promotional discussion.', doc: 'Open training material' }
      ],
      followups: ['Which Belotero for tear troughs?', 'Compare the Belotero products', 'What are the contraindications?']
    },

    {
      id: 'xeo-reconstitution', product: 'xeomin', category: 'Dosing & reconstitution',
      q: 'How should Xeomin be reconstituted?', market: 'UAE',
      keywords: ['reconstitut', 'reconstitute xeomin', 'mix xeomin', 'prepare xeomin', 'dilute xeomin'],
      scope: 'Xeomin',
      hcp: {
        lead: 'Xeomin is supplied as a powder and is reconstituted with preservative-free 0.9% sodium chloride before use. The exact volume determines the final concentration and should follow the locally approved preparation instructions.',
        points: [
          { text: 'Reconstitute only with <b>preservative-free 0.9% sodium chloride (saline)</b>.', src: 1 },
          { text: 'The <b>volume of saline sets the final concentration</b> — use the dilution the approved label specifies for the intended indication.', src: 1 },
          { text: 'Inject the saline gently and swirl; the reconstituted solution should be <b>clear and colourless</b>. Discard if particulate is present.', src: 2 }
        ],
        note: '<b>Preparation is per approved label.</b> Confirm the UAE label concentration for the indication before advising.'
      },
      rep: {
        lead: 'Xeomin (incobotulinumtoxinA) contains no complexing proteins. It is reconstituted with preservative-free 0.9% NaCl; the reconstitution table maps saline volume to units-per-0.1 mL for common indications.',
        points: [
          { text: 'Standard example: <b>2.5 mL saline per 100 U vial → 4 U / 0.1 mL</b>. Always cross-check the approved label table.', src: 1 },
          { text: 'No refrigeration is required prior to reconstitution; store per the label.', src: 2 },
          { text: 'Use the Reconstitution Quick Guide (v2.0, 3 Jul 2026) — it replaces the Jan 2026 guide.', src: 2 }
        ]
      },
      sources: [
        { n: 1, perm: 'hcp', title: 'Xeomin UAE Product Information', meta: 'Market: UAE · Local label · Effective 12 May 2026 · Page 5', excerpt: 'Xeomin is reconstituted with preservative-free sodium chloride 9 mg/mL (0.9%) solution for injection.', doc: 'Open local label' },
        { n: 2, perm: 'int', title: 'Xeomin Reconstitution Quick Guide', meta: 'Market: UAE · Quick reference · Effective 3 Jul 2026 · v2.0', excerpt: 'Add the specified saline volume, swirl gently; solution should be clear and colourless before use.', doc: 'Open document' }
      ],
      followups: ['How long can reconstituted Xeomin be stored?', 'What is the onset time for Xeomin?', 'What are the contraindications for Xeomin?']
    },

    {
      id: 'xeo-onset', product: 'xeomin', category: 'Product overview',
      q: 'What is the onset time for Xeomin?', market: 'UAE',
      keywords: ['onset', 'xeomin onset', 'how long xeomin work', 'xeomin start working', 'time to effect'],
      scope: 'Xeomin',
      hcp: {
        lead: 'Onset of effect for Xeomin is typically observed within the first several days after treatment, with the pattern of onset described in the approved product information. Individual response varies.',
        points: [
          { text: 'Onset of effect is <b>usually seen within the first few days</b> following injection.', src: 1 },
          { text: 'The full effect and its <b>duration are individual</b> and depend on indication and dose; refer to the approved label.', src: 1 }
        ]
      },
      sources: [
        { n: 1, perm: 'hcp', title: 'Xeomin UAE Product Information', meta: 'Market: UAE · Local label · Effective 12 May 2026 · Page 6', excerpt: 'The onset of effect is generally observed within the first days after injection.', doc: 'Open local label' }
      ],
      followups: ['How should Xeomin be reconstituted?', 'What are the contraindications for Xeomin?', 'How long can reconstituted Xeomin be stored?']
    },

    {
      id: 'xeo-storage', product: 'xeomin', category: 'Dosing & reconstitution',
      q: 'How long can reconstituted Xeomin be stored?', market: 'UAE', gap: true,
      keywords: ['store reconstituted', 'storage after reconstitution', 'how long store xeomin', 'xeomin shelf life reconstituted', 'reconstituted xeomin storage'],
      scope: 'Xeomin',
      hcp: {
        lead: 'The approved product information gives an in-use storage period for reconstituted Xeomin under refrigeration. A specific question about storage beyond that window is currently in review with Medical Affairs.',
        points: [
          { text: 'Reconstituted solution should be stored per the <b>approved label\'s in-use conditions</b> (refrigerated) and used within the stated period.', src: 1 },
          { text: 'From a product-quality standpoint, <b>use freshly reconstituted product</b> where possible.', src: 1 }
        ],
        note: '<b>Content gap in review:</b> "Xeomin storage after reconstitution > 24h" has been raised to Medical Affairs (4 reps asked). You\'ll be notified when an approved answer is published.'
      },
      sources: [
        { n: 1, perm: 'hcp', title: 'Xeomin UAE Product Information', meta: 'Market: UAE · Local label · Effective 12 May 2026 · Page 8', excerpt: 'Chemical and physical in-use stability has been demonstrated for the period stated under refrigerated conditions.', doc: 'Open local label' }
      ],
      followups: ['How should Xeomin be reconstituted?', 'What is the onset time for Xeomin?']
    },

    {
      id: 'xeo-contra', product: 'xeomin', category: 'Contraindications & safety',
      q: 'What are the contraindications for Xeomin?', market: 'UAE',
      keywords: ['xeomin contraindication', 'contraindications for xeomin', 'when not use xeomin', 'xeomin cannot'],
      scope: 'Xeomin',
      hcp: {
        lead: 'Xeomin is contraindicated in the situations listed in the approved product information, including known hypersensitivity and the presence of infection at the intended injection sites. Always review the full contraindications and precautions in the local label.',
        points: [
          { text: 'Contraindicated in <b>known hypersensitivity</b> to botulinum neurotoxin type A or any excipient.', src: 1 },
          { text: 'Contraindicated in the presence of <b>infection at the proposed injection site(s)</b>.', src: 1 },
          { text: 'Use with caution in <b>neuromuscular disorders</b>; see full precautions in the label.', src: 1 }
        ]
      },
      sources: [
        { n: 1, perm: 'hcp', title: 'Xeomin UAE Product Information', meta: 'Market: UAE · Local label · Effective 12 May 2026 · Page 4', excerpt: 'Contraindicated in hypersensitivity to the active substance or any excipient, and in the presence of infection at the proposed injection sites.', doc: 'Open local label' }
      ],
      followups: ['How should Xeomin be reconstituted?', 'Can Xeomin and Belotero be used in the same session?', 'What is the onset time for Xeomin?']
    },

    {
      id: 'xeo-bel-session', product: 'xeomin', category: 'Contraindications & safety',
      q: 'Can Xeomin and Belotero be used in the same session?', market: 'UAE',
      keywords: ['same session', 'xeomin and belotero', 'combine xeomin belotero', 'together same session', 'filler and toxin same'],
      scope: 'Xeomin + Belotero',
      hcp: {
        lead: 'Combining treatments in a single session is a clinical decision for the treating physician. Each product should be used within its own approved indication and administration guidance; there is no combined-use claim in the approved materials.',
        points: [
          { text: 'Each product must be used <b>strictly within its own approved indication</b> and label.', src: 1 },
          { text: 'Sequencing and same-session use are <b>physician clinical decisions</b>, not an approved combined claim.', src: 2 }
        ],
        note: '<b>No combined-use claim:</b> do not present same-session use as a Merz-endorsed protocol. Keep each product to its own label.'
      },
      sources: [
        { n: 1, perm: 'hcp', title: 'Xeomin UAE Product Information', meta: 'Market: UAE · Local label · Effective 12 May 2026 · Page 4', excerpt: 'Xeomin should be used within its approved indications and administration guidance.', doc: 'Open local label' },
        { n: 2, perm: 'int', title: 'Multi-product Discussion Guidance', meta: 'Market: MENA · Internal training · Effective 20 Jun 2026 · Page 3', excerpt: 'Combination and sequencing decisions are the responsibility of the treating physician.', doc: 'Open training material' }
      ],
      followups: ['What are the contraindications for Xeomin?', 'Tell me about Belotero', 'What is the onset time for Xeomin?']
    },

    {
      id: 'rad-contra', product: 'radiesse', category: 'Contraindications & safety',
      q: 'What are the contraindications for Radiesse?', market: 'UAE',
      keywords: ['radiesse contraindication', 'contraindications for radiesse', 'when not use radiesse', 'radiesse cannot'],
      scope: 'Radiesse',
      hcp: {
        lead: 'Radiesse is contraindicated in the situations described in the approved product information, including hypersensitivity to any component, presence of skin infection at the treatment site, and known tendency to form hypertrophic scars. Review the full label before use.',
        points: [
          { text: 'Contraindicated in <b>hypersensitivity</b> to any of the components.', src: 1 },
          { text: 'Contraindicated in the presence of <b>infection or inflammation at the treatment site</b>.', src: 1 },
          { text: 'Not recommended in patients with a <b>known tendency to hypertrophic scarring</b>; see full precautions.', src: 1 }
        ]
      },
      sources: [
        { n: 1, perm: 'hcp', title: 'Radiesse UAE Product Information', meta: 'Market: UAE · Local label · Effective 28 Jun 2026 · Page 3', excerpt: 'Contraindicated in the presence of hypersensitivity, active skin infection or inflammation at the treatment site.', doc: 'Open local label' }
      ],
      followups: ['What dilution options are approved for Radiesse?', 'Is Radiesse suitable for patients over 65?', 'Can Radiesse be diluted for skin quality?']
    },

    {
      id: 'rad-dilution', product: 'radiesse', category: 'Dosing & reconstitution',
      q: 'What dilution options are approved for Radiesse?', market: 'UAE',
      keywords: ['radiesse dilution', 'dilute radiesse', 'radiesse dilution options', 'hyperdilute', 'dilution protocol hands', 'radiesse skin quality'],
      scope: 'Radiesse',
      hcp: {
        lead: 'Radiesse can be used undiluted or mixed with lidocaine as described in the approved information. Dilution approaches and their indications are defined by the locally approved label and the physician\'s clinical judgement.',
        points: [
          { text: 'Radiesse may be <b>mixed with lidocaine</b> per the approved administration guidance for comfort.', src: 1 },
          { text: 'Any <b>dilution ratio and indication</b> (e.g. specific treatment areas) must be confirmed against the locally approved label.', src: 2 }
        ],
        note: '<b>Check indication and market:</b> some dilution/treatment-area uses may not be approved in every market. Confirm the UAE label.'
      },
      sources: [
        { n: 1, perm: 'hcp', title: 'Radiesse UAE Product Information', meta: 'Market: UAE · Local label · Effective 28 Jun 2026 · Page 5', excerpt: 'Radiesse may be mixed with lidocaine according to the described administration procedure.', doc: 'Open local label' },
        { n: 2, perm: 'int', title: 'Radiesse Dilution Guide', meta: 'Market: MENA · Internal training · Effective 15 Jun 2026 · Page 4', excerpt: 'Dilution ratios and their treatment areas should be applied only within the locally approved indication.', doc: 'Open document' }
      ],
      followups: ['What are the contraindications for Radiesse?', 'Can Radiesse be diluted for skin quality?', 'Is Radiesse suitable for patients over 65?']
    },

    {
      id: 'rad-skin-quality', product: 'radiesse', category: 'Product overview',
      q: 'Can Radiesse be diluted for skin quality?', market: 'UAE',
      keywords: ['radiesse skin quality', 'diluted for skin quality', 'radiesse biostimulation skin', 'skin quality radiesse'],
      scope: 'Radiesse',
      hcp: {
        lead: 'Whether a diluted Radiesse skin-quality use is available depends on the locally approved indication. Present only the indications approved in your market; confirm against the UAE label before discussing this use.',
        points: [
          { text: 'Radiesse acts as a <b>collagen biostimulator</b> within its approved indications.', src: 1 },
          { text: 'A diluted "skin quality" application must be <b>supported by the local approved indication</b> before it is discussed with an HCP.', src: 2 }
        ],
        note: '<b>Market-specific:</b> do not extend a claim approved elsewhere to the UAE without confirming the local label.'
      },
      sources: [
        { n: 1, perm: 'hcp', title: 'Radiesse UAE Product Information', meta: 'Market: UAE · Local label · Effective 28 Jun 2026 · Page 2', excerpt: 'Radiesse stimulates the body\'s own collagen production within its approved indications.', doc: 'Open local label' },
        { n: 2, perm: 'int', title: 'Radiesse Dilution Guide', meta: 'Market: MENA · Internal training · Effective 15 Jun 2026 · Page 6', excerpt: 'Treatment-area claims must map to the locally approved indication.', doc: 'Open document' }
      ],
      followups: ['What dilution options are approved for Radiesse?', 'What are the contraindications for Radiesse?', 'Is Radiesse suitable for patients over 65?']
    },

    {
      id: 'rad-over-65', product: 'radiesse', category: 'Contraindications & safety',
      q: 'Is Radiesse suitable for patients over 65?', market: 'UAE', resolved: true,
      keywords: ['over 65', 'patients over 65', 'radiesse elderly', 'radiesse older patients', 'radiesse age'],
      scope: 'Radiesse',
      hcp: {
        lead: 'This question was recently resolved by Medical Affairs. Radiesse use in older patients follows the same approved indications and precautions; patient selection remains a physician assessment considering skin quality and expectations.',
        points: [
          { text: 'There is <b>no upper age limit</b> stated as a contraindication; selection follows the standard approved precautions.', src: 1 },
          { text: 'Patient suitability is a <b>physician assessment</b> of skin condition, expectations and general contraindications.', src: 1 }
        ],
        note: '<b>Answered by Medical Affairs</b> — this gap was resolved and pushed to reps who asked. Effective 3 Jul 2026.'
      },
      sources: [
        { n: 1, perm: 'hcp', title: 'Radiesse — Medical Affairs Response', meta: 'Market: UAE · Approved answer · Effective 3 Jul 2026', excerpt: 'No specific upper age contraindication applies; standard patient selection and precautions apply.', doc: 'Open answer' }
      ],
      followups: ['What are the contraindications for Radiesse?', 'What dilution options are approved for Radiesse?']
    },

    {
      id: 'ult-sessions', product: 'ultherapy', category: 'Product overview',
      q: 'How many Ultherapy sessions are needed?', market: 'UAE',
      keywords: ['ultherapy sessions', 'how many sessions', 'ultherapy treatments needed', 'ultherapy how many'],
      scope: 'Ultherapy',
      hcp: {
        lead: 'Ultherapy is generally positioned as a single-treatment procedure, with the treatment plan individualised by the physician. Maintenance timing depends on the patient\'s response and skin condition, per the approved information.',
        points: [
          { text: 'Commonly a <b>single treatment</b>, with results developing gradually over the following months.', src: 1 },
          { text: '<b>Maintenance and repeat timing are individualised</b> by the physician based on response.', src: 1 }
        ]
      },
      sources: [
        { n: 1, perm: 'hcp', title: 'Ultherapy UAE Product Information', meta: 'Market: UAE · Local label · Effective 28 Jun 2026 · Page 3', excerpt: 'Ultherapy is typically performed as a single session, with individualised maintenance.', doc: 'Open local label' }
      ],
      followups: ['What does Ultherapy treat?', 'How long do Ultherapy results last?']
    },

    {
      id: 'ult-overview', product: 'ultherapy', category: 'Product overview',
      q: 'What does Ultherapy treat?', market: 'UAE',
      keywords: ['ultherapy treat', 'what is ultherapy', 'ultherapy overview', 'ultherapy indication', 'ultherapy duration', 'how long ultherapy last'],
      scope: 'Ultherapy',
      hcp: {
        lead: 'Ultherapy is a micro-focused ultrasound (MFU) procedure used for lifting and tightening within its approved indications. It delivers focused ultrasound energy to defined tissue depths; results develop over the months following treatment.',
        points: [
          { text: 'Uses <b>micro-focused ultrasound</b> to reach defined depths for lifting and tightening.', src: 1 },
          { text: 'Results develop <b>gradually over 2–3 months</b> as the natural response builds, within the approved indication.', src: 1 }
        ]
      },
      sources: [
        { n: 1, perm: 'hcp', title: 'Ultherapy UAE Product Information', meta: 'Market: UAE · Local label · Effective 28 Jun 2026 · Page 2', excerpt: 'Ultherapy uses micro-focused ultrasound for lifting within the approved indication.', doc: 'Open local label' }
      ],
      followups: ['How many Ultherapy sessions are needed?', 'Ultherapy vs RF devices']
    }
  ];

  /* --------------------------------------------------------- objection handlers */
  const OBJECTIONS = [
    {
      id: 'obj-radiesse-pain',
      keywords: ['radiesse too painful', 'radiesse painful', 'radiesse pain objection', 'pain radiesse'],
      q: 'A doctor says Radiesse is too painful — how do I respond?', product: 'radiesse',
      scope: 'Objection · Radiesse comfort',
      hcp: {
        lead: 'Acknowledge the concern, then stay on approved comfort options: Radiesse can be mixed with lidocaine per the approved administration guidance, which is the compliant way to address injection comfort.',
        points: [
          { text: 'Acknowledge the HCP\'s experience — do not dismiss it.', src: 1 },
          { text: 'Note that Radiesse <b>may be mixed with lidocaine</b> per the approved procedure to support comfort.', src: 1 },
          { text: 'Keep technique and anaesthesia choices as the <b>physician\'s clinical decision</b>.', src: 2 }
        ],
        note: '<b>Objection mode:</b> stay factual and within label. Do not promise a pain-free outcome.'
      },
      sources: [
        { n: 1, perm: 'hcp', title: 'Radiesse UAE Product Information', meta: 'Market: UAE · Local label · Effective 28 Jun 2026 · Page 5', excerpt: 'Radiesse may be mixed with lidocaine according to the described procedure.', doc: 'Open local label' },
        { n: 2, perm: 'int', title: 'Objection Handling Guide — Comfort', meta: 'Market: MENA · Internal training · Effective 10 Jun 2026 · Page 2', excerpt: 'Address comfort concerns with approved options; defer technique to the physician.', doc: 'Open training material' }
      ],
      followups: ['What dilution options are approved for Radiesse?', 'What are the contraindications for Radiesse?']
    }
  ];

  /* --------------------------------------------------------- off-label triggers */
  const OFFLABEL = [
    { match: ['radiesse', 'lip'], product: 'radiesse', area: 'lips', note: 'Radiesse use in the lips is generally outside the approved indication in most markets.' },
    { match: ['xeomin', 'masseter'], product: 'xeomin', area: 'masseter reduction', note: 'Masseter reduction may be outside the approved indication depending on market.' },
    { match: ['radiesse', 'lips'], product: 'radiesse', area: 'lips', note: 'Radiesse use in the lips is generally outside the approved indication in most markets.' }
  ];

  /* ------------------------------------------------------------- PV / AE triggers */
  const PV_TERMS = ['adverse', 'side effect', 'reaction', 'drooping', 'ptosis', 'complaint', 'reported', 'swelling weeks', 'nodule', 'granuloma', 'complication', 'bruising severe'];

  /* --------------------------------------------------------------- library docs */
  const DOCS = [
    { id: 'd1', product: 'belotero', title: 'Belotero Balance Product Information', meta: 'Regulatory · Belotero Balance · UAE · Updated 7 Jul 2026 · v4.2', perm: 'hcp', isNew: true, updated: '2026-07-07', change: 'approved treatment-area wording revised.', type: 'label', country: 'UAE' },
    { id: 'd2', product: 'xeomin', title: 'Xeomin Reconstitution Quick Guide', meta: 'Quick reference · Xeomin · UAE · Updated 3 Jul 2026 · v2.0', perm: 'int', isNew: true, updated: '2026-07-03', change: 'new approved version replaces Jan 2026 guide.', type: 'dosing', country: 'UAE' },
    { id: 'd3', product: 'xeomin', title: 'Xeomin UAE Product Information', meta: 'Regulatory · Xeomin · UAE · Effective 12 May 2026 · v3.1', perm: 'hcp', updated: '2026-05-12', type: 'label', country: 'UAE' },
    { id: 'd4', product: 'radiesse', title: 'Radiesse Dilution Guide', meta: 'Internal training · Radiesse · MENA · Effective 15 Jun 2026', perm: 'int', updated: '2026-06-15', type: 'dosing', country: 'MENA' },
    { id: 'd5', product: 'radiesse', title: 'Radiesse UAE Product Information', meta: 'Regulatory · Radiesse · UAE · Effective 28 Jun 2026 · v2.4', perm: 'hcp', updated: '2026-06-28', type: 'label', country: 'UAE' },
    { id: 'd6', product: 'radiesse', title: 'Radiesse Hands Indication Study', meta: 'Clinical evidence · Radiesse · Global · Effective 2 Feb 2026', perm: 'int', updated: '2026-02-02', type: 'evidence', country: 'Global' },
    { id: 'd7', product: 'ultherapy', title: 'Ultherapy Treatment-Depth Reference', meta: 'Quick reference · Ultherapy · UAE · Effective 28 Jun 2026', perm: 'int', updated: '2026-06-28', type: 'dosing', country: 'UAE' },
    { id: 'd8', product: 'ultherapy', title: 'Ultherapy UAE Product Information', meta: 'Regulatory · Ultherapy · UAE · Effective 28 Jun 2026 · v1.9', perm: 'hcp', updated: '2026-06-28', type: 'label', country: 'UAE' },
    { id: 'd9', product: 'belotero', title: 'Belotero Portfolio Overview', meta: 'Product guide · Belotero · UAE · Effective 3 Jul 2026', perm: 'int', updated: '2026-07-03', type: 'label', country: 'UAE' },
    { id: 'd10', product: 'belotero', title: 'Belotero UAE Product Information', meta: 'Regulatory · Belotero · UAE · Effective 1 Jun 2026 · v3.0', perm: 'hcp', updated: '2026-06-01', type: 'label', country: 'UAE' },
    { id: 'd11', product: 'xeomin', title: 'Objection Handling Guide — Comfort', meta: 'Internal training · Cross-brand · MENA · Effective 10 Jun 2026', perm: 'int', updated: '2026-06-10', type: 'objection', country: 'MENA' }
  ];

  const QUICK_ACCESS = ['Local product labels', 'Dosing & reconstitution', 'Contraindications & safety', 'Clinical evidence', 'Objection handlers', 'HCP-shareable materials'];

  /* ------------------------------------------------------------------- home feed */
  const TEAM_ASKED = [
    { product: 'radiesse', q: 'What are the contraindications for Radiesse?', n: 23, entry: 'rad-contra' },
    { product: 'xeomin', q: 'Can Xeomin and Belotero be used in the same session?', n: 18, entry: 'xeo-bel-session' },
    { product: 'radiesse', q: 'What is the Radiesse dilution protocol for hands?', n: 9, entry: 'rad-dilution' },
    { product: 'belotero', q: 'Which Belotero product for tear troughs?', n: 11, entry: 'bel-tear-troughs' }
  ];

  const DYN_CARDS = [
    { id: 'dc1', type: 'answer', tag: 'ANSWERED', html: 'Your question about <b>Radiesse in patients over 65</b> now has an answer from Medical Affairs.', cta: 'View', entry: 'rad-over-65' },
    { id: 'dc2', type: 'newkb', tag: 'NEW', html: '<b>Belotero Balance product information</b> updated: approved treatment-area wording revised.', cta: 'See what changed', doc: 'd1' }
  ];

  /* -------------------------------------------------------------- manager / admin */
  const REPS = [
    { name: 'Karim A.', profile: 'mb', q30: 64, completion: '50 of 50 · 0 pending', last: 'Just now', cert: [['p','R'],['p','X'],['p','B']], next: 'Oct 9', country: 'UAE' },
    { name: 'Sara M.', profile: 'mb', q30: 51, completion: '42 of 50 · 8 pending', last: 'Today', cert: [['p','R'],['f','X'],['p','B']], next: { st: 'd', label: 'Retake Jul 14' }, country: 'KSA' },
    { name: 'Nadia F.', profile: 'uo', q30: 29, completion: '45 of 50 · 5 pending', last: 'Today', cert: [['p','U']], next: 'Sep 30', country: 'KSA' },
    { name: 'Omar H.', profile: 'mb', q30: 38, completion: '30 of 50 · 20 pending', last: 'Yesterday', cert: [['p','R'],['p','X'],['n','B']], next: 'Jul 12', country: 'UAE' },
    { name: 'Lina K.', profile: 'mb', q30: 4, completion: '3 of 10 assigned · 7 pending', last: '9 days ago', cert: [['n','R'],['n','X'],['n','B']], next: { st: 'i', label: 'Baseline pending' }, country: 'UAE' },
    { name: 'Yousef R.', profile: 'uo', q30: 0, completion: '0 of 10 assigned · 10 pending', last: 'Never logged in', cert: [['n','U']], next: { st: 'i', label: 'Not started' }, country: 'UAE' }
  ];

  const KNOWLEDGE_SIGNALS = [
    { topic: 'Radiesse contraindications', focus: true, pct: 88, n: 23, note: 'Also the most-failed assessment topic (58% fail rate)' },
    { topic: 'Xeomin + filler same session', pct: 70, n: 18 },
    { topic: 'Ultherapy duration', pct: 54, n: 14 },
    { topic: 'Belotero layering', pct: 42, n: 11 }
  ];

  const COMPETITIVE = [
    { label: 'Xeomin vs other neurotoxins', n: '14 comparisons' },
    { label: 'Radiesse vs other biostimulators', n: '8 comparisons' },
    { label: 'Ultherapy vs RF devices', n: '5 comparisons' }
  ];

  const CONTENT_GAPS = [
    { label: 'Radiesse in patients over 65', st: 'done', text: 'RESOLVED' },
    { label: 'Xeomin storage after reconstitution', st: 'r', text: 'IN REVIEW' },
    { label: 'Ultherapy + RF microneedling', st: 'o', text: 'OPEN' }
  ];

  const ADMIN_GAPS = [
    { title: 'Radiesse in patients over 65', meta: '6 reps asked · resolved with a written answer', st: 'done', action: 'resolved' },
    { title: 'Xeomin storage after reconstitution > 24h', meta: '4 reps asked · 5 days old', action: 'write' },
    { title: 'Ultherapy + RF microneedling', meta: '3 reps asked · 11 days old', action: 'upload' }
  ];

  const COMPLIANCE = [
    { text: '"Patient reported drooping 3 weeks after..."', flag: 'pv', label: 'PV · ROUTED 24H' },
    { text: '"Can Radiesse be used in the lips?" · RAD', flag: 'ol', label: 'OFF-LABEL' },
    { text: '"Xeomin for masseter reduction dosing" · XEO', flag: 'ol', label: 'OFF-LABEL' }
  ];

  const ADMIN_USERS = [
    { name: 'Karim A.', country: 'UAE', profile: 'mb', completion: '50 of 50', cert: [['p','R'],['p','X'],['p','B']], products: ['xeomin', 'belotero', 'radiesse', 'ultherapy'] },
    { name: 'Nadia F.', country: 'KSA', profile: 'uo', completion: '45 of 50', cert: [['p','U']], products: ['ultherapy'] },
    { name: 'Sara M.', country: 'KSA', profile: 'mb', completion: '42 of 50', cert: [['p','R'],['f','X'],['p','B']], products: ['radiesse', 'xeomin', 'belotero'] }
  ];

  const ASSESSMENT_POOLS = [
    { name: 'Radiesse pool', preset: 32, ai: 41 },
    { name: 'Xeomin pool', preset: 28, ai: 30 },
    { name: 'Belotero pool', preset: 24, ai: 28 },
    { name: 'Ultherapy pool', preset: 18, ai: 22 }
  ];

  /* =========================================================================
     PART B — Assessment & certification module (data model)
     All questions are FICTIONAL demo content grounded in the mock library.
     ========================================================================= */

  /* Two rep profiles (Addendum A). 50 questions / quarter. */
  const PROFILES = {
    mb: { id: 'mb', label: 'Multi-brand', letter: 'MULTI', brands: ['radiesse', 'xeomin', 'belotero'], total: 50, split: { radiesse: 20, xeomin: 15, belotero: 15 } },
    uo: { id: 'uo', label: 'Ultherapy-only', letter: 'ULT', brands: ['ultherapy'], total: 50, split: { ultherapy: 50 } }
  };

  /* Question pool config (mix = % preset vs AI), admin-adjustable (B4). */
  const POOL_CONFIG = {
    radiesse: { preset: 32, ai: 41, mix: 55, dist: { easy: 25, medium: 45, hard: 30 } },
    xeomin: { preset: 28, ai: 30, mix: 55, dist: { easy: 25, medium: 45, hard: 30 } },
    belotero: { preset: 24, ai: 28, mix: 50, dist: { easy: 25, medium: 45, hard: 30 } },
    ultherapy: { preset: 18, ai: 22, mix: 50, dist: { easy: 30, medium: 45, hard: 25 } }
  };

  /* Question bank. type MCQ; source_ref for provenance (B3); origin preset/AI;
     status active/draft (AI drafts await admin review, B4/G). */
  const QUESTIONS = [
    // ---- Radiesse
    { id: 'q-rad-1', product: 'radiesse', topic: 'Contraindications', difficulty: 'hard', type: 'mcq', origin: 'preset', status: 'active', country: 'UAE',
      stem: 'A patient presents with an active inflamed lesion at the intended treatment site. Per the approved information, what is the correct action for Radiesse?',
      options: ['Proceed at a lower volume', 'Do not treat — active infection/inflammation at the site is a contraindication', 'Pre-treat with antibiotics and inject same day', 'Dilute with extra lidocaine and proceed'],
      correct: 1, explanation: 'Radiesse is contraindicated in the presence of infection or inflammation at the treatment site.', source_ref: 'Radiesse UAE PI · Page 3' },
    { id: 'q-rad-2', product: 'radiesse', topic: 'Administration', difficulty: 'medium', type: 'mcq', origin: 'preset', status: 'active', country: 'UAE',
      stem: 'Which statement about mixing Radiesse with lidocaine is consistent with the approved administration guidance?',
      options: ['It is not permitted under any circumstances', 'It may be mixed with lidocaine according to the described procedure', 'It must always be mixed 1:1 with lidocaine', 'Lidocaine changes the approved indication'],
      correct: 1, explanation: 'Radiesse may be mixed with lidocaine per the described administration procedure.', source_ref: 'Radiesse UAE PI · Page 5' },
    { id: 'q-rad-3', product: 'radiesse', topic: 'Mechanism', difficulty: 'medium', type: 'mcq', origin: 'ai', status: 'draft', country: 'UAE',
      stem: 'Radiesse works within its approved indications primarily by which mechanism?',
      options: ['Neuromodulation of muscle', 'Calcium hydroxylapatite acting as a collagen biostimulator', 'Hyaluronic acid volumisation only', 'Focused ultrasound energy'],
      correct: 1, explanation: 'Radiesse (CaHA) stimulates the body\'s own collagen production within its approved indications.', source_ref: 'Radiesse UAE PI · Page 2' },
    // ---- Xeomin
    { id: 'q-xeo-1', product: 'xeomin', topic: 'Reconstitution', difficulty: 'easy', type: 'mcq', origin: 'preset', status: 'active', country: 'UAE',
      stem: 'Which diluent is used to reconstitute Xeomin?',
      options: ['Sterile water for injection', 'Preservative-free 0.9% sodium chloride', 'Bacteriostatic saline with preservative', 'Lactated Ringer\'s solution'],
      correct: 1, explanation: 'Xeomin is reconstituted with preservative-free 0.9% sodium chloride.', source_ref: 'Xeomin UAE PI · Page 5' },
    { id: 'q-xeo-2', product: 'xeomin', topic: 'Onset', difficulty: 'medium', type: 'mcq', origin: 'preset', status: 'active', country: 'UAE',
      stem: 'An HCP asks when onset of effect is generally observed after Xeomin injection. The approved answer is:',
      options: ['Within minutes', 'Generally within the first days after injection', 'Only after 6 weeks', 'Onset is not described in the label'],
      correct: 1, explanation: 'Onset of effect is generally observed within the first days after injection.', source_ref: 'Xeomin UAE PI · Page 6' },
    { id: 'q-xeo-3', product: 'xeomin', topic: 'Composition', difficulty: 'hard', type: 'mcq', origin: 'ai', status: 'draft', country: 'UAE',
      stem: 'Which property distinguishes Xeomin (incobotulinumtoxinA) in its formulation?',
      options: ['It contains complexing proteins', 'It is free of complexing proteins', 'It requires no reconstitution', 'It is a hyaluronic acid'],
      correct: 1, explanation: 'Xeomin contains no complexing proteins.', source_ref: 'Xeomin Reconstitution Quick Guide · v2.0' },
    // ---- Belotero
    { id: 'q-bel-1', product: 'belotero', topic: 'Portfolio', difficulty: 'easy', type: 'mcq', origin: 'preset', status: 'active', country: 'UAE',
      stem: 'Belotero Soft is intended for which type of correction?',
      options: ['Deep volumising of the cheeks', 'Superficial injection for fine lines', 'Bone-level augmentation', 'Neuromodulation of fine lines'],
      correct: 1, explanation: 'Belotero Soft is developed for superficial injection to treat fine lines.', source_ref: 'Belotero Portfolio Overview · Page 6' },
    { id: 'q-bel-2', product: 'belotero', topic: 'Product selection', difficulty: 'hard', type: 'mcq', origin: 'preset', status: 'active', country: 'UAE',
      stem: 'A rep is asked which Belotero product to use for a specific area. The compliant basis for selection is:',
      options: ['The most expensive product available', 'The rep\'s personal preference', 'The specific treatment area, patient need and locally approved indication', 'Whatever a competitor recommends'],
      correct: 2, explanation: 'Selection is based on treatment area, patient need and the locally approved indication.', source_ref: 'Belotero UAE PI · Page 2' },
    { id: 'q-bel-3', product: 'belotero', topic: 'Technology', difficulty: 'medium', type: 'mcq', origin: 'ai', status: 'draft', country: 'UAE',
      stem: 'The Belotero range is built on which core technology?',
      options: ['Cohesive Polydensified Matrix (CPM)', 'Calcium hydroxylapatite microspheres', 'Micro-focused ultrasound', 'Botulinum toxin type A'],
      correct: 0, explanation: 'The Belotero range is built on CPM technology.', source_ref: 'Belotero Product Selection Guide · Page 7' },
    // ---- Ultherapy
    { id: 'q-ult-1', product: 'ultherapy', topic: 'Mechanism', difficulty: 'easy', type: 'mcq', origin: 'preset', status: 'active', country: 'UAE',
      stem: 'Ultherapy delivers which type of energy?',
      options: ['Radiofrequency', 'Micro-focused ultrasound (MFU)', 'Intense pulsed light', 'Cryolipolysis'],
      correct: 1, explanation: 'Ultherapy uses micro-focused ultrasound for lifting within its approved indication.', source_ref: 'Ultherapy UAE PI · Page 2' },
    { id: 'q-ult-2', product: 'ultherapy', topic: 'Treatment plan', difficulty: 'medium', type: 'mcq', origin: 'preset', status: 'active', country: 'UAE',
      stem: 'How is the number of Ultherapy sessions best described per the approved information?',
      options: ['Always exactly three sessions', 'Typically a single session, with individualised maintenance', 'A minimum of ten sessions', 'Daily sessions for two weeks'],
      correct: 1, explanation: 'Ultherapy is typically performed as a single session, with individualised maintenance.', source_ref: 'Ultherapy UAE PI · Page 3' },
    { id: 'q-ult-3', product: 'ultherapy', topic: 'Results', difficulty: 'medium', type: 'mcq', origin: 'ai', status: 'draft', country: 'UAE',
      stem: 'Over what timeframe do Ultherapy results typically develop?',
      options: ['Immediately, within 24 hours', 'Gradually over 2–3 months', 'Only after 2 years', 'Results are permanent from day one'],
      correct: 1, explanation: 'Results develop gradually over 2–3 months as the natural response builds.', source_ref: 'Ultherapy UAE PI · Page 2' }
  ];

  /* Certification record for the signed-in rep (Karim, multi-brand). */
  const REP_CERT = {
    profile: 'mb',
    nextDue: '9 Oct 2026',
    cadence: 3, // months (adaptive: strong performers can move to 6)
    brands: {
      radiesse: { status: 'certified', score: 88, certifiedAt: '9 Jul 2026', expiresAt: '9 Oct 2026' },
      xeomin: { status: 'certified', score: 84, certifiedAt: '9 Jul 2026', expiresAt: '9 Oct 2026' },
      belotero: { status: 'certified', score: 90, certifiedAt: '9 Jul 2026', expiresAt: '9 Oct 2026' }
    },
    history: [
      { date: '9 Jul 2026', type: 'Recertification', score: 87, result: 'Passed' },
      { date: '10 Apr 2026', type: 'Recertification', score: 81, result: 'Passed' },
      { date: '12 Jan 2026', type: 'Baseline (week 1)', score: 68, result: 'Passed' }
    ]
  };

  /* Assessment monitor rows (admin B7). Mirrors reps + schedule/cert state. */
  const ASSESS_MONITOR = [
    { name: 'Karim A.', profile: 'mb', country: 'UAE', status: 'certified', lastScore: 87, due: '9 Oct 2026', cadence: 3 },
    { name: 'Sara M.', profile: 'mb', country: 'KSA', status: 'failed', lastScore: 62, due: 'Retake 14 Jul 2026', cadence: 3, focus: 'Xeomin' },
    { name: 'Nadia F.', profile: 'uo', country: 'KSA', status: 'certified', lastScore: 91, due: '30 Sep 2026', cadence: 6 },
    { name: 'Omar H.', profile: 'mb', country: 'UAE', status: 'due', lastScore: 79, due: 'Due 12 Jul 2026', cadence: 3 },
    { name: 'Lina K.', profile: 'mb', country: 'UAE', status: 'baseline', lastScore: null, due: 'Baseline pending', cadence: 3 },
    { name: 'Yousef R.', profile: 'uo', country: 'UAE', status: 'baseline', lastScore: null, due: 'Not started', cadence: 3 }
  ];

  /* Most-failed questions + weakest topics for gap analytics (B7). */
  const MOST_FAILED = [
    { product: 'radiesse', stem: 'Contraindication with active infection at the site', failRate: 58, n: 40 },
    { product: 'xeomin', stem: 'Correct reconstitution diluent', failRate: 41, n: 33 },
    { product: 'belotero', stem: 'Basis for product selection', failRate: 37, n: 28 },
    { product: 'ultherapy', stem: 'Typical number of sessions', failRate: 29, n: 21 }
  ];
  const WEAK_TOPICS = [
    { topic: 'Radiesse contraindications', pct: 58 },
    { topic: 'Xeomin composition', pct: 44 },
    { topic: 'Belotero product selection', pct: 37 },
    { topic: 'Ultherapy results timeline', pct: 24 }
  ];

  /* Permission sets (Addendum G): separated, combinable, never one super-role. */
  const PERMISSION_SETS = [
    { id: 'content', label: 'Medical Affairs — content review', desc: 'Approve answers, resolve content gaps' },
    { id: 'pv', label: 'Pharmacovigilance', desc: 'Review and route adverse-event reports' },
    { id: 'assess', label: 'Assessment / learning admin', desc: 'Question pools, drafts, cadence, thresholds' },
    { id: 'users', label: 'User & role admin', desc: 'Provision accounts, assign permissions' },
    { id: 'kb', label: 'Knowledge-base admin', desc: 'Manage the approved document library' }
  ];
  const ADMIN_ROLES = [
    { name: 'Fouad J.', role: 'Medical Affairs', perms: ['content', 'pv', 'assess'] },
    { name: 'Ahmed A.', role: 'Country lead', perms: ['users', 'assess'] },
    { name: 'Diana R.', role: 'Marketing', perms: ['content'] }
  ];

  global.MerzData = {
    PRODUCTS, CATEGORIES, CATEGORY_QUESTIONS, KB, OBJECTIONS, OFFLABEL, PV_TERMS,
    DOCS, QUICK_ACCESS, TEAM_ASKED, DYN_CARDS, REPS, KNOWLEDGE_SIGNALS,
    COMPETITIVE, CONTENT_GAPS, ADMIN_GAPS, COMPLIANCE, ADMIN_USERS, ASSESSMENT_POOLS,
    PROFILES, POOL_CONFIG, QUESTIONS, REP_CERT, ASSESS_MONITOR, MOST_FAILED, WEAK_TOPICS,
    PERMISSION_SETS, ADMIN_ROLES
  };
})(window);
