/* ============================================================
 * SIH26043 — Registration Wizard field schemas
 * One entry per source sub-entity type (14). Each field key is the
 * camelCase JSON key that SourceMapper maps onto the typed entity
 * column (registration create `source` object).
 * ============================================================ */
'use strict';

/* Compact builder: f(key, label, group, type?, opts?) */
const f = (key, label, group, type = 'text', opts = {}) =>
  Object.assign({ key, label, group, type }, opts);
const sel = (key, label, group, options, opts = {}) =>
  f(key, label, group, 'select', Object.assign({ options }, opts));
const txt = (key, label, group, opts = {}) =>
  f(key, label, group, 'textarea', Object.assign({ rows: 3 }, opts));

const REQUIRED_HINT = 'required to submit';

const TYPES = {

  /* ---------------- GOVERNMENT ---------------- */
  DEPARTMENT: {
    bucket: 'GOVT', name: 'Government Department', icon: '🏛️',
    tagline: 'Ministry / line department posting a problem, scheme or project.',
    fields: [
      f('departmentFullName', 'Department / Ministry full name', 'Identity', 'text', { required: 1, hint: REQUIRED_HINT }),
      f('ministryName', 'Parent ministry name', 'Identity'),
      f('officialEmailDomain', 'Official email domain (e.g. .gov.in)', 'Identity', 'text', { placeholder: 'gov.in' }),
      f('schemeMissionReference', 'Scheme / mission reference', 'Identity'),
      f('projectCode', 'Project code (if any)', 'Identity'),

      sel('problemType', 'Problem type', 'Problem Scope', ['INFRASTRUCTURE', 'SERVICE_DELIVERY', 'POLICY', 'TECHNOLOGY', 'DATA_ANALYTICS']),
      txt('scopeOfWork', 'Scope of work / problem', 'Problem Scope'),
      txt('targetBeneficiariesDesc', 'Target beneficiaries (description)', 'Problem Scope'),
      txt('geographicCoverage', 'Geographic coverage', 'Problem Scope'),
      txt('dataResourcesAvailable', 'Data / resources available', 'Problem Scope'),

      f('budgetRangeMin', 'Budget range — min (₹)', 'Budget & Timeline', 'money'),
      f('budgetRangeMax', 'Budget range — max (₹)', 'Budget & Timeline', 'money'),
      f('timelineDeadline', 'Timeline / deadline', 'Budget & Timeline', 'date'),
      txt('expectedDeliverables', 'Expected deliverables', 'Budget & Timeline'),
      txt('technicalRequirements', 'Technical requirements', 'Budget & Timeline'),
      txt('complianceRequirements', 'Compliance requirements', 'Budget & Timeline'),
      txt('evaluationCriteria', 'Evaluation criteria', 'Budget & Timeline'),

      f('nodalOfficerName', 'Nodal officer name', 'Team & Contacts'),
      f('nodalOfficerDesignation', 'Nodal officer designation', 'Team & Contacts'),
      f('nodalOfficerPhone', 'Nodal officer phone', 'Team & Contacts'),
      f('contactPersonName', 'Contact person (if different)', 'Team & Contacts'),
      f('contactEmail', 'Contact email', 'Team & Contacts', 'email'),
      f('contactPhone', 'Contact phone', 'Team & Contacts'),

      txt('previousAttemptsSummary', 'Previous attempts (summary)', 'History'),
      txt('stakeholdersInvolved', 'Stakeholders involved', 'History'),
      f('authorizationDocumentUrl', 'Authorization document URL', 'Compliance'),
    ],
  },

  PRI: {
    bucket: 'GOVT', name: 'Panchayati Raj Institution', icon: '🏘️',
    tagline: 'Gram Panchayat / Block / Zilla Parishad raising a local governance issue.',
    fields: [
      f('priName', 'Panchayat / PRI name', 'Identity', 'text', { required: 1, hint: REQUIRED_HINT }),
      f('priCode', 'PRI code / GP code', 'Identity'),
      sel('priLevel', 'PRI level', 'Identity', ['GRAM_PANCHAYAT', 'BLOCK_PANCHAYAT', 'ZILLA_PARISHAD'], { required: 1, hint: REQUIRED_HINT }),
      sel('identifiedThrough', 'Issue identified through', 'Identity', ['GRAM_SABHA', 'WARD_SABHA', 'MAHILA_SABHA', 'STANDING_COMMITTEE']),
      f('ministryName', 'Line ministry (Panchayati Raj / Rural Dev)', 'Identity'),
      f('gpdpReference', 'GPDP plan reference', 'Identity'),
      f('gramSabhaResolutionNo', 'Gram Sabha resolution no.', 'Governance'),
      f('gramSabhaResolutionDate', 'Gram Sabha resolution date', 'Governance', 'date'),
      txt('relatedSchemes', 'Related government schemes', 'Governance'),

      txt('sectorTheme', 'Sector / theme', 'Problem'),
      txt('villageWardNames', 'Villages / wards affected', 'Problem'),
      txt('existingInfrastructureStatus', 'Existing infrastructure status', 'Problem'),
      f('householdsAffected', 'Households affected', 'Problem', 'number'),
      f('populationAffectedMale', 'Affected population — male', 'Problem', 'number'),
      f('populationAffectedFemale', 'Affected population — female', 'Problem', 'number'),
      f('populationAffectedOther', 'Affected population — other', 'Problem', 'number'),

      sel('fundsSource', 'Funds source', 'Budget', ['FIFTEEN_FC', 'SFC', 'OWN', 'OTHER']),
      f('fundsAvailable', 'Funds available (₹)', 'Budget', 'money'),
      f('priorityRanking', 'Priority ranking', 'Budget', 'number'),
      sel('fieldVerificationStatus', 'Field verification status', 'Budget', ['PENDING', 'VERIFIED', 'REJECTED']),

      f('sarpanchName', 'Sarpanch name', 'Team & Contacts'),
      f('secretaryName', 'Secretary name', 'Team & Contacts'),
      f('contactPhone', 'Contact phone', 'Team & Contacts'),
      f('contactEmail', 'Contact email', 'Team & Contacts', 'email'),
    ],
  },

  ULB: {
    bucket: 'GOVT', name: 'Urban Local Body', icon: '🏙️',
    tagline: 'Municipal Corporation / Municipality / Nagar Panchayat civic problem.',
    fields: [
      f('ulbName', 'ULB name', 'Identity', 'text', { required: 1, hint: REQUIRED_HINT }),
      sel('ulbType', 'ULB type', 'Identity', ['MUNICIPAL_CORPORATION', 'MUNICIPALITY', 'NAGAR_PANCHAYAT']),
      f('ulbCode', 'ULB code', 'Identity'),
      f('wardNumber', 'Ward number', 'Location'),
      f('wardName', 'Ward name', 'Location'),
      txt('streetAreaLandmark', 'Street / area / landmark', 'Location'),
      f('propertyId', 'Property / survey ID (if relevant)', 'Location'),

      sel('problemCategory', 'Problem category', 'Problem', ['ROADS', 'WATER_SUPPLY', 'SEWERAGE', 'DRAINAGE', 'STREET_LIGHTING', 'SOLID_WASTE', 'PUBLIC_HEALTH', 'BUILDING_VIOLATION', 'PARKS', 'TRAFFIC', 'OTHER']),
      sel('severity', 'Severity', 'Problem', ['CRITICAL', 'MAJOR', 'MINOR']),
      sel('frequency', 'Frequency', 'Problem', ['ONE_TIME', 'RECURRING', 'CHRONIC']),
      f('affectedAreaSqm', 'Affected area (sq m)', 'Problem', 'number'),
      f('affectedHouseholds', 'Affected households', 'Problem', 'number'),
      f('existingComplaintReference', 'Existing complaint reference', 'Problem'),
      f('budgetHead', 'Budget head', 'Budget'),
      f('relevantMunicipalDept', 'Relevant municipal department', 'Budget'),

      f('wardCouncillorName', 'Ward councillor name', 'Team & Contacts'),
      f('wardCouncillorPhone', 'Ward councillor phone', 'Team & Contacts'),
      f('municipalCommissionerName', 'Municipal commissioner name', 'Team & Contacts'),
      f('municipalCommissionerPhone', 'Municipal commissioner phone', 'Team & Contacts'),
      f('contactEmail', 'Contact email', 'Team & Contacts', 'email'),
    ],
  },

  /* ---------------- CITIZEN ---------------- */
  INDIVIDUAL: {
    bucket: 'CITIZEN', name: 'Individual Citizen', icon: '🙋',
    tagline: 'A citizen reporting a civic / local problem they face.',
    fields: [
      f('citizenName', 'Your full name', 'Identity'),
      f('contactNumber', 'Contact number', 'Identity', 'text', { required: 1, hint: REQUIRED_HINT }),
      f('emailId', 'Email ID', 'Identity', 'email'),
      f('preferredLanguage', 'Preferred language', 'Identity', 'select', { options: ['en', 'hi'] }),
      f('anonymous', 'Report anonymously', 'Privacy', 'boolean'),
      f('aadhaarHash', 'Aadhaar (hash — optional)', 'Identity'),
      f('voterIdHash', 'Voter ID (hash — optional)', 'Identity'),

      f('dateOfObservation', 'Date of observation', 'Problem', 'date'),
      sel('frequency', 'How often it occurs', 'Problem', ['FIRST_TIME', 'DAILY', 'WEEKLY', 'OCCASIONAL']),
      sel('selfReportedSeverity', 'Self-reported severity', 'Problem', ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
      f('peopleAffectedEstimate', 'Estimated people affected', 'Problem', 'number'),
      txt('landmarkNearby', 'Landmark nearby', 'Location'),
      sel('reportedElsewhere', 'Reported elsewhere?', 'Problem', ['true', 'false']),
      txt('elsewhereReference', 'Elsewhere reference / complaint no.', 'Problem'),
      txt('desiredResolution', 'What resolution you want', 'Problem'),
      f('audioDescriptionAvailable', 'Audio description available?', 'Problem', 'boolean'),
      f('willingToValidateSolution', 'Willing to help validate a solution', 'Problem', 'boolean'),
    ],
  },

  RWA: {
    bucket: 'CITIZEN', name: 'Resident Welfare Association', icon: '🏢',
    tagline: 'An RWA / residents’ association raising a common-area issue.',
    fields: [
      f('rwaName', 'RWA name', 'Identity', 'text', { required: 1, hint: REQUIRED_HINT }),
      f('rwaRegistrationNumber', 'RWA registration number', 'Identity'),
      f('colonyApartmentName', 'Colony / apartment name', 'Identity'),
      f('representativeName', 'Representative name', 'Team & Contacts'),
      f('representativeDesignation', 'Representative designation', 'Team & Contacts'),
      f('contactPhone', 'Contact phone', 'Team & Contacts'),
      f('contactEmail', 'Contact email', 'Team & Contacts', 'email'),
      f('residentsRepresented', 'Residents represented', 'Problem', 'number'),
      sel('scope', 'Scope', 'Problem', ['COMMON_AREA', 'INDIVIDUAL_UNITS']),
      f('resolutionPassed', 'Resolution passed?', 'Governance', 'boolean'),
      f('resolutionDate', 'Resolution date', 'Governance', 'date'),
      txt('previousCommunicationWithAuthorities', 'Previous communication with authorities', 'History'),
    ],
  },

  /* ---------------- INDUSTRY (base fields inherited by all) ---------------- */
  COMPANY: {
    bucket: 'INDUSTRY', name: 'Company', icon: '🏭',
    tagline: 'A company publishing an innovation / challenge problem.',
    fields: [
      f('companyName', 'Company name', 'Identity', 'text', { required: 1, hint: REQUIRED_HINT }),
      f('cinRegistrationNumber', 'CIN registration number', 'Identity'),
      f('industrySector', 'Industry sector', 'Identity'),
      sel('companySize', 'Company size', 'Identity', ['LARGE', 'MID', 'SMALL']),
      f('parentCompanyName', 'Parent company', 'Identity'),
      f('businessUnit', 'Business unit', 'Identity'),
      f('annualTurnoverCr', 'Annual turnover (₹ Cr)', 'Identity', 'money'),
      f('employeeCount', 'Employee count', 'Identity', 'number'),
      f('website', 'Website', 'Identity', 'url'),
      f('publicSector', 'Public-sector undertaking?', 'Identity', 'boolean'),

      sel('problemType', 'Problem type', 'Problem', ['PROCESS_IMPROVEMENT', 'PRODUCT_INNOVATION', 'SUSTAINABILITY', 'DIGITAL_TRANSFORMATION', 'SUPPLY_CHAIN', 'OTHER']),
      txt('challengeBrief', 'Challenge brief', 'Problem'),
      txt('currentState', 'Current state / as-is', 'Problem'),
      txt('desiredStateSuccessMetrics', 'Desired state / success metrics', 'Problem'),
      txt('constraints', 'Constraints', 'Problem'),
      sel('technologyReadinessLevel', 'Technology readiness level', 'Problem', ['TRL_1', 'TRL_2', 'TRL_3', 'TRL_4', 'TRL_5', 'TRL_6', 'TRL_7', 'TRL_8', 'TRL_9']),
      txt('dataAvailableForSolvers', 'Data available for solvers', 'Problem'),
      sel('ipArrangement', 'IP arrangement', 'Problem', ['COMPANY_RETAINS', 'SHARED', 'SOLVER_OWNS', 'OPEN_SOURCE']),
      f('budgetPrizeFunding', 'Budget / prize funding (₹)', 'Budget', 'money'),
      f('pilotOpportunity', 'Pilot opportunity available?', 'Budget', 'boolean'),
      txt('commercializationPathway', 'Commercialisation pathway', 'Budget'),

      f('internalChampionName', 'Internal champion name', 'Team & Contacts'),
      f('internalChampionDesignation', 'Internal champion designation', 'Team & Contacts'),
      f('ndaRequired', 'NDA required?', 'Compliance', 'boolean'),
      txt('previousSolutionsTried', 'Previous solutions tried', 'History'),
      f('contactEmail', 'Contact email', 'Team & Contacts', 'email'),
      f('contactPhone', 'Contact phone', 'Team & Contacts'),
    ],
  },

  STARTUP: {
    bucket: 'INDUSTRY', name: 'Startup', icon: '🚀',
    tagline: 'A startup seeking a problem to build for, or posing one.',
    fields: [
      f('companyName', 'Startup / company name', 'Identity', 'text', { required: 1, hint: REQUIRED_HINT }),
      f('incorporationDate', 'Incorporation date', 'Identity', 'date'),
      f('founderCeoName', 'Founder / CEO name', 'Team & Contacts'),
      f('founderCeoContact', 'Founder / CEO contact', 'Team & Contacts'),
      f('sectorDomain', 'Sector / domain', 'Identity'),
      sel('stage', 'Stage', 'Identity', ['IDEA', 'MVP', 'EARLY_REVENUE', 'GROWTH', 'SCALE']),
      f('teamSize', 'Team size', 'Identity', 'number'),
      txt('teamComposition', 'Team composition', 'Identity'),
      sel('fundingRaised', 'Funding raised', 'Identity', ['BOOTSTRAPPED', 'ANGEL', 'SEED', 'SERIES_A', 'SERIES_B_PLUS']),
      f('udyamRegistration', 'Udyam registration no.', 'Identity'),

      txt('problemTheyFace', 'Problem you face (as a startup)', 'Problem'),
      txt('problemTheyWantToPublish', 'Problem you want to publish', 'Problem'),
      sel('technologyReadinessLevel', 'Technology readiness level', 'Problem', ['TRL_1', 'TRL_2', 'TRL_3', 'TRL_4', 'TRL_5', 'TRL_6', 'TRL_7', 'TRL_8', 'TRL_9']),
      f('prototypeMvpAvailable', 'Prototype / MVP available?', 'Problem', 'boolean'),
      txt('marketValidation', 'Market validation', 'Problem'),
      sel('collaborationSought', 'Collaboration sought', 'Collaboration', ['TECHNICAL', 'RESEARCH', 'FUNDING', 'MARKET_ACCESS']),
      f('incubatorAcceleratorAffiliation', 'Incubator / accelerator affiliation', 'Collaboration'),
      f('ndaRequired', 'NDA required?', 'Compliance', 'boolean'),
      f('contactEmail', 'Contact email', 'Team & Contacts', 'email'),
    ],
  },

  MSME: {
    bucket: 'INDUSTRY', name: 'MSME', icon: '⚙️',
    tagline: 'Micro / Small / Medium Enterprise raising a business problem.',
    fields: [
      f('companyName', 'Enterprise name', 'Identity', 'text', { required: 1, hint: REQUIRED_HINT }),
      f('udyamRegistrationNumber', 'Udyam registration number', 'Identity', 'text', { required: 1, hint: REQUIRED_HINT }),
      sel('enterpriseType', 'Enterprise type', 'Identity', ['MICRO', 'SMALL', 'MEDIUM']),
      f('productServiceCategory', 'Product / service category', 'Identity'),
      f('nicCode', 'NIC code', 'Identity'),
      f('annualTurnover', 'Annual turnover (₹)', 'Identity', 'money'),
      f('employmentCount', 'Employment count', 'Identity', 'number'),
      f('districtIndustryCentre', 'District Industries Centre', 'Identity'),

      sel('problemCategory', 'Problem category', 'Problem', ['TECHNOLOGY_UPGRADE', 'QUALITY_CERTIFICATION', 'MARKET_ACCESS', 'SKILL_GAP', 'WORKING_CAPITAL', 'ENERGY_EFFICIENCY']),
      txt('specificChallenge', 'Specific challenge', 'Problem'),
      sel('expectedSupport', 'Expected support', 'Support', ['TECHNICAL', 'FINANCIAL', 'TRAINING', 'INFRASTRUCTURE']),
      f('ndaRequired', 'NDA required?', 'Compliance', 'boolean'),
      f('contactPersonName', 'Contact person', 'Team & Contacts'),
      f('contactEmail', 'Contact email', 'Team & Contacts', 'email'),
      f('contactPhone', 'Contact phone', 'Team & Contacts'),
    ],
  },

  CSR: {
    bucket: 'INDUSTRY', name: 'CSR Organisation', icon: '🤝',
    tagline: 'A CSR entity / corporate foundation funding a social problem.',
    fields: [
      f('companyName', 'Organisation name', 'Identity', 'text', { required: 1, hint: REQUIRED_HINT }),
      f('csrPolicyReference', 'CSR policy reference', 'Identity'),
      f('csr1Registration', 'CSR-1 registration number', 'Identity'),
      f('scheduleViiAlignment', 'Schedule VII alignment', 'Compliance'),
      txt('problemProjectDescription', 'Problem / project description', 'Problem'),
      txt('targetGeography', 'Target geography', 'Problem'),
      f('targetBeneficiaries', 'Target beneficiaries', 'Problem', 'number'),
      f('budgetAllocation', 'Budget allocation (₹)', 'Budget', 'money'),
      sel('implementationPartnerPref', 'Implementation partner preference', 'Collaboration', ['NGO', 'GOVT', 'DIRECT', 'HEI']),
      txt('monitoringEvaluationRequirements', 'Monitoring & evaluation requirements', 'Compliance'),
      txt('previousCsrProjects', 'Previous CSR projects', 'History'),
      f('contactPersonName', 'Contact person', 'Team & Contacts'),
      f('contactEmail', 'Contact email', 'Team & Contacts', 'email'),
      f('contactPhone', 'Contact phone', 'Team & Contacts'),
    ],
  },

  /* ---------------- COMMUNITY ---------------- */
  NGO: {
    bucket: 'COMMUNITY', name: 'NGO', icon: '🌱',
    tagline: 'A non-profit / NGO working on a community issue.',
    fields: [
      f('organizationName', 'Organisation name', 'Identity', 'text', { required: 1, hint: REQUIRED_HINT }),
      f('ngoDarpanId', 'NGO Darpan ID', 'Identity'),
      f('registrationNumber', 'Registration number', 'Identity'),
      sel('registrationType', 'Registration type', 'Identity', ['TRUST', 'SOCIETY', 'SEC_', 'COOPERATIVE', 'CBO', 'FPO', 'OTHER']),
      f('registrationDate', 'Registration date', 'Identity', 'date'),
      f('yearsOfOperation', 'Years of operation', 'Identity', 'number'),
      f('fcraRegistration', 'FCRA registration', 'Compliance'),
      f('has12aStatus', '12A status?', 'Compliance', 'boolean'),
      f('has80gStatus', '80G status?', 'Compliance', 'boolean'),
      f('csr1Registration', 'CSR-1 registration', 'Compliance'),
      f('geographicFocus', 'Geographic focus', 'Identity'),
      txt('sectoralExpertise', 'Sectoral expertise', 'Identity'),
      txt('problemStatement', 'Problem statement', 'Problem'),
      txt('proposedIntervention', 'Proposed intervention', 'Problem'),
      f('budgetEstimate', 'Budget estimate (₹)', 'Budget', 'money'),
      sel('communityEngagementMethod', 'Community engagement method', 'Problem', ['PRA', 'FGD', 'BASELINE_SURVEY', 'OTHER']),
      txt('baselineData', 'Baseline data', 'Problem'),
      txt('beneficiaryProfile', 'Beneficiary profile', 'Problem'),
      txt('implementationCapacity', 'Implementation capacity', 'Problem'),
      txt('staffCountFieldPresence', 'Staff / field presence', 'Problem'),
      f('contactPersonName', 'Contact person', 'Team & Contacts'),
      f('contactEmail', 'Contact email', 'Team & Contacts', 'email'),
      f('contactPhone', 'Contact phone', 'Team & Contacts'),
      f('monitoringPlan', 'Monitoring plan', 'Compliance'),
    ],
  },

  SHG: {
    bucket: 'COMMUNITY', name: 'Self-Help Group', icon: '👥',
    tagline: 'A women’s / community self-help group.',
    fields: [
      f('organizationName', 'SHG name', 'Identity', 'text', { required: 1, hint: REQUIRED_HINT }),
      f('shgName', 'SHG display name', 'Identity', 'text', { required: 1, hint: REQUIRED_HINT }),
      f('shgRegistrationNumber', 'SHG registration number', 'Identity'),
      sel('formingAgency', 'Forming agency', 'Identity', ['BANK', 'NGO', 'GOVT_PROGRAM']),
      f('memberCount', 'Member count', 'Identity', 'number'),
      txt('memberDemographics', 'Member demographics', 'Identity'),
      f('savingsCorpus', 'Savings corpus (₹)', 'Identity', 'money'),
      sel('bankLinkageStatus', 'Bank linkage status', 'Finance', ['SAVINGS_ONLY', 'LOAN_TAKEN', 'LOAN_REPAID', 'NO_ACCOUNT']),
      f('villageName', 'Village', 'Location'),
      f('gpName', 'Gram Panchayat', 'Location'),
      f('blockName', 'Block', 'Location'),
      f('districtName', 'District', 'Location'),
      sel('problemIssue', 'Problem issue', 'Problem', ['LIVELIHOOD', 'SKILL', 'INFRASTRUCTURE', 'MARKET', 'SOCIAL', 'OTHER']),
      txt('currentActivity', 'Current activity', 'Problem'),
      txt('proposedActivity', 'Proposed activity', 'Problem'),
      f('expectedInvestmentRequired', 'Expected investment required (₹)', 'Budget', 'money'),
      f('beneficiaryContributionPct', 'Beneficiary contribution (%)', 'Budget', 'number'),
      f('marketLinkageNeeded', 'Market linkage needed?', 'Problem', 'boolean'),
      txt('trainingRequired', 'Training required', 'Problem'),
      txt('voFederationSupport', 'VO / federation support', 'Problem'),
      f('contactPhone', 'Contact phone', 'Team & Contacts'),
    ],
  },

  CBO_COOP: {
    bucket: 'COMMUNITY', name: 'CBO / Cooperative', icon: '🌾',
    tagline: 'Community-based organisation or farmers’ cooperative.',
    fields: [
      f('organizationName', 'Organisation name', 'Identity', 'text', { required: 1, hint: REQUIRED_HINT }),
      sel('orgType', 'Organisation type', 'Identity', ['COOPERATIVE_SOCIETY', 'CBO', 'FPO', 'OTHER'], { required: 1, hint: REQUIRED_HINT }),
      f('registrationNumber', 'Registration number', 'Identity'),
      sel('registrationType', 'Registration type', 'Identity', ['TRUST', 'SOCIETY', 'SEC_', 'COOPERATIVE', 'CBO', 'FPO', 'OTHER']),
      f('membershipCount', 'Membership count', 'Identity', 'number'),
      sel('membershipType', 'Membership type', 'Identity', ['FARMERS', 'ARTISANS', 'WOMEN', 'MIXED', 'OTHER']),
      f('geographicCoverage', 'Geographic coverage', 'Identity'),
      txt('sector', 'Sector', 'Identity'),
      txt('governanceStructure', 'Governance structure', 'Identity'),
      f('annualTurnover', 'Annual turnover (₹)', 'Identity', 'money'),
      txt('existingAssetsInfrastructure', 'Existing assets / infrastructure', 'Identity'),
      txt('proposedSolution', 'Proposed solution', 'Problem'),
      f('equityContribution', 'Equity contribution (₹)', 'Budget', 'money'),
      sel('externalSupportNeeded', 'External support needed', 'Support', ['TECHNICAL', 'FINANCIAL', 'MARKET', 'INFRASTRUCTURE']),
      f('contactPersonName', 'Contact person', 'Team & Contacts'),
      f('contactPhone', 'Contact phone', 'Team & Contacts'),
    ],
  },

  /* ---------------- HEI ---------------- */
  UNIVERSITY: {
    bucket: 'HEI', name: 'University', icon: '🎓',
    tagline: 'A university / college submitting a research or institutional problem.',
    fields: [
      f('institutionName', 'Institution name', 'Identity', 'text', { required: 1, hint: REQUIRED_HINT }),
      sel('institutionType', 'Institution type', 'Identity', ['CENTRAL_UNIV', 'STATE_UNIV', 'DEEMED', 'PRIVATE', 'AUTONOMOUS_COLLEGE', 'RESEARCH_INSTITUTE']),
      f('naacGrade', 'NAAC grade', 'Identity'),
      f('nirfRank', 'NIRF rank', 'Identity', 'number'),
      f('ugcAicteAffiliation', 'UGC / AICTE affiliation', 'Identity'),
      f('departmentCentreName', 'Department / centre', 'Identity'),

      f('principalInvestigatorName', 'Principal investigator (PI) name', 'Team & Contacts'),
      f('piDesignation', 'PI designation', 'Team & Contacts'),
      f('piContactEmail', 'PI contact email', 'Team & Contacts', 'email'),
      f('piContactPhone', 'PI contact phone', 'Team & Contacts'),
      txt('coInvestigators', 'Co-investigators (names & roles)', 'Team & Contacts'),

      sel('problemType', 'Problem type', 'Problem', ['RESEARCH', 'INSTITUTIONAL', 'COMMUNITY', 'INDUSTRY_COLLAB']),
      txt('researchGapLiteratureContext', 'Research gap / literature context', 'Problem'),
      txt('researchQuestionsObjectives', 'Research questions / objectives', 'Problem'),
      txt('methodologyApproach', 'Methodology / approach', 'Problem'),
      txt('expectedOutcomes', 'Expected outcomes', 'Problem'),
      txt('existingFacilitiesLabs', 'Existing facilities / labs', 'Problem'),
      txt('industryGovernmentPartner', 'Industry / government partner', 'Problem'),
      f('timelineMonths', 'Timeline (months)', 'Budget & Timeline', 'number'),
      f('budgetRequirement', 'Budget requirement (₹)', 'Budget & Timeline', 'money'),
      f('ethicalClearanceNeeded', 'Ethical clearance needed?', 'Compliance', 'boolean'),
      sel('studentInvolvement', 'Student involvement', 'Problem', ['UG', 'PG', 'PHD', 'NONE']),
      txt('previousRelatedWork', 'Previous related work', 'History'),
      f('contactEmail', 'Contact email', 'Team & Contacts', 'email'),
    ],
  },

  RESEARCH_LAB: {
    bucket: 'HEI', name: 'Research Lab', icon: '🔬',
    tagline: 'A research lab / institute seeking collaboration or posing a problem.',
    fields: [
      f('institutionName', 'Lab / institute name', 'Identity', 'text', { required: 1, hint: REQUIRED_HINT }),
      f('labName', 'Lab name', 'Identity'),
      sel('institutionType', 'Institution type', 'Identity', ['CENTRAL_UNIV', 'STATE_UNIV', 'DEEMED', 'PRIVATE', 'AUTONOMOUS_COLLEGE', 'RESEARCH_INSTITUTE']),
      f('ugcAicteAffiliation', 'UGC / AICTE affiliation', 'Identity'),
      f('scientistResearcherName', 'Lead scientist / researcher name', 'Team & Contacts'),
      f('researcherDesignation', 'Researcher designation', 'Team & Contacts'),
      f('researchArea', 'Research area', 'Identity'),
      sel('trlCurrent', 'Current TRL', 'Problem', ['TRL_1', 'TRL_2', 'TRL_3', 'TRL_4', 'TRL_5', 'TRL_6', 'TRL_7', 'TRL_8', 'TRL_9']),
      sel('collaborationSought', 'Collaboration sought', 'Collaboration', ['INDUSTRY', 'GOVT', 'INTERNATIONAL', 'OTHER_LABS']),
      txt('equipmentFacilitiesAvailable', 'Equipment / facilities available', 'Problem'),
      sel('fundingStatus', 'Funding status', 'Budget', ['FUNDED', 'SEEKING', 'CO_FUNDING']),
      txt('patentIpPotential', 'Patent / IP potential', 'Problem'),
      txt('publicationPlan', 'Publication plan', 'Problem'),
      txt('ongoingProjects', 'Ongoing projects', 'Problem'),
      f('contactEmail', 'Contact email', 'Team & Contacts', 'email'),
      f('contactPhone', 'Contact phone', 'Team & Contacts'),
    ],
  },
};

/* Human labels for boolean yes/no handling & group ordering helper */
const BOOL_TRUE_LABEL = 'Yes';
const BOOL_FALSE_LABEL = 'No';

/* Bucket metadata (display order) + the subtype codes each bucket offers */
const BUCKETS = [
  { code: 'GOVT', label: 'Government', icon: '🏛️', blurb: 'Departments, PRIs, ULBs', types: ['DEPARTMENT', 'PRI', 'ULB'] },
  { code: 'CITIZEN', label: 'Citizen', icon: '🙋', blurb: 'Individuals, RWAs', types: ['INDIVIDUAL', 'RWA'] },
  { code: 'INDUSTRY', label: 'Industry', icon: '🏭', blurb: 'Companies, startups, MSMEs, CSR', types: ['COMPANY', 'STARTUP', 'MSME', 'CSR'] },
  { code: 'COMMUNITY', label: 'Community', icon: '🌱', blurb: 'NGOs, SHGs, cooperatives', types: ['NGO', 'SHG', 'CBO_COOP'] },
  { code: 'HEI', label: 'Higher Education / Research', icon: '🎓', blurb: 'Universities, research labs', types: ['UNIVERSITY', 'RESEARCH_LAB'] },
];

if (typeof module !== 'undefined') module.exports = { TYPES, BUCKETS };
