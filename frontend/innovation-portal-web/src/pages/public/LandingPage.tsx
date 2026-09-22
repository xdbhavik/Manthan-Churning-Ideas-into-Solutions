import { motion } from 'framer-motion';
import { LinkButton } from '../../components/ui';
import { formatLocation } from '../../lib/formatters';

const METRICS = [
  { label: 'Active Challenges', value: '140+', variant: 'primary' as const },
  { label: 'Govt Ministries', value: '28', variant: 'secondary' as const },
  { label: 'Git Traceability', value: '100%', variant: 'accepted' as const },
];

const VALUE_CARDS = [
  {
    icon: 'explore',
    number: '01 / DISCOVERY',
    title: 'Discover Challenges',
    description:
      'Find verified, high-impact national problems that require innovative engineering under strict access rule governance and authentic institutional sponsorship.',
    linkLabel: 'Filter by ministries',
    linkIcon: 'north_east',
    iconColor: 'primary',
    linkColor: 'primary',
  },
  {
    icon: 'code_blocks',
    number: '02 / PROTOTYPING',
    title: 'Build & Trace',
    description:
      'Form student or university teams, connect GitHub repositories, pin immutable commit SHAs, and upload up to 50MB of verified project artifacts.',
    linkLabel: 'Explore repository sync',
    linkIcon: 'north_east',
    iconColor: 'secondary',
    linkColor: 'secondary',
  },
  {
    icon: 'rocket_launch',
    number: '03 / REALIZATION',
    title: 'Deploy for Impact',
    description:
      'Advance solutions through structured, multi-tier evaluation rounds with consistent reviewers directly toward institutional acceptance and field pilot deployment.',
    linkLabel: 'Reviewer governance',
    linkIcon: 'north_east',
    iconColor: 'accepted',
    linkColor: 'accepted',
  },
];

const PROCESS_STEPS = [
  {
    number: '01',
    icon: 'travel_explore',
    title: 'Explore',
    description: 'Browse curated problem statements published by ministries & departments.',
  },
  {
    number: '02',
    icon: 'fact_check',
    title: 'Understand',
    description: 'Examine baseline datasets, constraints, telemetry specs, and target outcomes.',
  },
  {
    number: '03',
    icon: 'construction',
    title: 'Build',
    description: 'Form multi-disciplinary teams, engineer prototypes, and document schemas.',
  },
  {
    number: '04',
    icon: 'upload_file',
    title: 'Submit',
    description: 'Pin GitHub Commit SHAs, upload up to 50MB of evidence files, and seal draft.',
  },
  {
    number: '05',
    icon: 'checklist_rtl',
    title: 'Review',
    description: 'Assigned subject matter experts conduct anonymous, structured evaluations.',
  },
  {
    number: '06',
    icon: 'verified',
    title: 'Improve',
    description: 'Refine based on evaluator returned feedback or advance to pilot rollout.',
    accent: true,
  },
];

const FEATURED_PROBLEMS = [
  {
    source: 'Ministry of Jal Shakti',
    urgency: 'CRITICAL',
    urgencyVariant: 'error' as const,
    location: 'National River Basins',
    published: '2 days ago',
    title: 'Automated Micro-Pollutant Detection in Rural Water Inflows via Edge Spectroscopy',
    domains: ['AI', 'IoT', 'Water Mgmt', 'Sensors'],
    outcome: 'Real-time edge telemetry with <5% false alert rate and low-cost sensor schematics.',
    files: '4 files (28MB)',
  },
  {
    source: 'Dept of Agriculture',
    urgency: 'HIGH',
    urgencyVariant: 'review' as const,
    location: 'Maharashtra & MP',
    published: '3 days ago',
    title: 'Decentralized Cold-Chain Telemetry and Spoilage Prediction for Perishable Produce',
    domains: ['IoT', 'Supply Chain', 'Embedded'],
    outcome: 'Predictive spoilage alert engine with sensor data pipeline and fallback SMS gateway.',
    files: '3 files (14MB)',
  },
  {
    source: 'Municipal Corporation',
    urgency: 'NORMAL',
    urgencyVariant: 'draft' as const,
    location: 'Urban Smart Cities',
    published: '5 days ago',
    title: 'Dynamic EV Charging Load Balancer for Microgrids Under Peak Grid Stress',
    domains: ['Clean Energy', 'Smart Grid', 'Optimization'],
    outcome: 'Simulation testbed and firmware prototype demonstrating dynamic phase shedding.',
    files: '6 files (42MB)',
  },
];

export default function LandingPage() {
  return (
    <div className="page-transition">
      {/* HERO SECTION */}
      <section className="relative w-full overflow-hidden bg-surface-canvas pt-12 pb-24 md:pt-16 md:pb-32">
        <motion.div
          className="absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-secondary-fixed/40 blur-3xl pointer-events-none -z-0"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          className="absolute top-1/2 left-0 w-80 h-80 rounded-full bg-surface-container-high/60 blur-3xl pointer-events-none -z-0"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
        <div className="max-w-7xl mx-auto px-space-lg relative z-10">
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="lg:col-span-7 flex flex-col items-start">
              <motion.div
                className="inline-flex items-center gap-space-xs px-3 py-1.5 rounded-full bg-surface-card shadow-sm mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="font-label-mono-sm text-label-mono-sm text-primary uppercase tracking-wider font-semibold">
                  National Innovation Initiative
                </span>
              </motion.div>
              <motion.h1
                className="font-display-lg text-display-lg text-on-surface tracking-tight max-w-2xl mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                Discover Problems.<br />
                <span className="text-primary">Build Solutions.</span><br />
                Create Impact.
              </motion.h1>
              <motion.p
                className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mb-8 leading-relaxed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                Explore real-world challenges published by ministries, institutions, and communities. Transform innovative engineering into practical, rigorously evaluated solutions.
              </motion.p>
              <motion.div
                className="flex flex-wrap items-center gap-space-md w-full sm:w-auto"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <LinkButton
                  to="/problems"
                  variant="primary"
                  className="h-12 px-6 rounded-lg bg-primary text-on-primary font-headline-sm text-headline-sm hover:bg-primary-container transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
                >
                  Explore Problems
                  <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
                </LinkButton>
                <LinkButton
                  to="#how-it-works"
                  variant="secondary"
                  className="h-12 px-6 rounded-lg bg-surface-card text-on-surface font-headline-sm text-headline-sm hover:bg-surface-container-low transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg text-on-surface-variant">play_circle</span>
                  How It Works
                </LinkButton>
              </motion.div>
              <motion.div
                className="grid grid-cols-3 gap-6 pt-10 mt-10 border-t border-border-subtle w-full max-w-xl"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                {METRICS.map((metric, idx) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 + idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="font-display-lg text-headline-lg text-on-surface font-bold">
                      {metric.value}
                    </div>
                    <div className="font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase">
                      {metric.label}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
            <motion.div
              className="lg:col-span-5 flex flex-col gap-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                className="bg-surface-card rounded-xl shadow-xl p-6 relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-state-returned-border" />
                    <span className="w-3 h-3 rounded-full bg-state-review-border" />
                    <span className="w-3 h-3 rounded-full bg-state-accepted-border" />
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant ml-2">INNOVATION PIPELINE</span>
                  </div>
                  <span className="font-label-mono-sm text-label-mono-sm text-state-accepted-text bg-state-accepted-bg px-2 py-0.5 rounded">V2.4 ACTIVE</span>
                </div>
                <div className="flex flex-col gap-3 relative">
                  {[
                    { icon: 'hub', bg: 'bg-primary-fixed', color: 'text-primary', step: '01. Published Problems', meta: 'Ministries & Institutions', badge: '140+ Statements' },
                    { icon: 'terminal', bg: 'bg-secondary-fixed', color: 'text-secondary', step: '02. Student & University Ideas', meta: 'Git Commit-SHA Pinning', badge: 'SHA-256', badgeBg: 'bg-state-submitted-bg', badgeColor: 'text-state-submitted-text' },
                    { icon: 'rate_review', bg: 'bg-state-review-bg', color: 'text-state-review-text', step: '03. Evaluated Project Solutions', meta: 'Same-Evaluator Review Cycles', badge: '50 MB Artifacts' },
                    { icon: 'verified_user', bg: 'bg-on-primary/10', color: 'text-on-primary', step: '04. Real-World Deployment', meta: 'Institutional Adoption', badge: 'READY', badgeBg: 'bg-on-primary', badgeColor: 'text-primary', cardBg: 'bg-primary' },
                  ].map((flow, idx) => (
                    <motion.div
                      key={idx}
                      className={`p-3.5 rounded-lg flex items-center justify-between hover:bg-surface-container-low transition-colors shadow-sm ${flow.cardBg || ''}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 + idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-md ${flow.bg} flex items-center justify-center ${flow.color}`}>
                          <span className="material-symbols-outlined text-sm">{flow.icon}</span>
                        </div>
                        <div>
                          <div className="font-headline-sm text-headline-sm text-on-surface">{flow.step}</div>
                          <div className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">{flow.meta}</div>
                        </div>
                      </div>
                      <span className={`font-label-mono-sm text-label-mono-sm px-2 py-1 rounded ${flow.badgeBg || 'bg-surface-card'} ${flow.badgeColor || 'text-on-surface-variant'} font-semibold`}>
                        {flow.badge}
                      </span>
                    </motion.div>
                  ))}
                  {[
                    null,
                    null,
                    null,
                  ].map((_, idx) => (
                    <motion.div key={`arrow-${idx}`} className="flex justify-center -my-1 text-outline">
                      <span className="material-symbols-outlined text-sm">south</span>
                    </motion.div>
                  ))}
                </div>
                <motion.div
                  className="mt-4 pt-3 flex items-center justify-between bg-surface-container-low p-2.5 rounded-lg"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">policy</span>
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant font-mono">HASH: 7f4a20b9e8cd</span>
                  </div>
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">PORTAL COMPLIANT</span>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* PLATFORM VALUE SECTION */}
      <section className="w-full py-20 bg-surface-card">
        <div className="max-w-7xl mx-auto px-space-lg">
          <motion.div
            className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div>
              <div className="font-label-mono-sm text-label-mono-sm text-secondary uppercase tracking-widest font-semibold mb-2">Architected for Accuracy</div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">The Rigorous Innovation Lifecycle</h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
              Strict institutional compliance combined with frictionless developer workflows ensures only verifiable, battle-tested solutions advance.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
            {VALUE_CARDS.map((card, idx) => (
              <motion.div
                key={card.title}
                className="bg-surface-canvas rounded-xl p-space-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                <div>
                  <div className={`w-12 h-12 rounded-xl bg-surface-card shadow-sm flex items-center justify-center ${card.iconColor} mb-6 group-hover:bg-${card.iconColor} group-hover:text-on-primary transition-colors`}>
                    <span className="material-symbols-outlined">{card.icon}</span>
                  </div>
                  <div className="font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase mb-1">{card.number}</div>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-3">{card.title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-6">
                    {card.description}
                  </p>
                </div>
                <div className="pt-4 flex items-center gap-2 font-headline-sm text-headline-sm" style={{ color: `var(--color-${card.linkColor})` }}>
                  <span>{card.linkLabel}</span>
                  <span className="material-symbols-outlined text-sm">{card.linkIcon}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="w-full py-20 bg-surface-canvas" id="how-it-works">
        <div className="max-w-7xl mx-auto px-space-lg">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <span className="font-label-mono-sm text-label-mono-sm text-primary uppercase tracking-wider font-semibold bg-surface-container px-3 py-1 rounded-full">Lifecycle Guide</span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mt-3 mb-3">Six Steps to Execution</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              From institutional problem registration to production grade delivery.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {PROCESS_STEPS.map((step, idx) => (
              <motion.div
                key={step.number}
                className={`bg-surface-card p-5 rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group ${step.accent ? 'bg-primary text-on-primary' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                <div className={`font-label-mono-md text-headline-sm ${step.accent ? 'text-on-primary' : 'text-primary'} font-bold mb-3`}>
                  {step.number}
                </div>
                <div>
                  <h4 className={`font-headline-sm text-headline-sm ${step.accent ? 'text-on-primary' : 'text-on-surface'} mb-1.5`}>
                    {step.title}
                  </h4>
                  <p className={`font-body-sm text-body-sm ${step.accent ? 'text-on-primary/80' : 'text-on-surface-variant'} leading-relaxed`}>
                    {step.description}
                  </p>
                </div>
                <div className={`mt-4 pt-3 ${step.accent ? 'text-on-primary' : 'text-on-surface-variant'} flex items-center`}>
                  <span className="material-symbols-outlined text-base">{step.icon}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PROBLEMS PREVIEW */}
      <section className="w-full py-20 bg-surface-card">
        <div className="max-w-7xl mx-auto px-space-lg">
          <motion.div
            className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-error animate-ping" />
                <span className="font-label-mono-sm text-label-mono-sm text-error uppercase font-semibold">Priority Challenges</span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">Featured Problem Statements</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                High urgency national and regional challenges open for student solution drafts.
              </p>
            </div>
            <LinkButton
              to="/problems"
              variant="secondary"
              className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-headline-sm text-headline-sm hover:bg-surface-container-high transition-colors flex items-center gap-2 self-start md:self-auto"
            >
              View All 140+ Statements
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </LinkButton>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {FEATURED_PROBLEMS.map((problem, idx) => (
              <motion.div
                key={problem.title}
                className="bg-surface-canvas rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="font-label-mono-sm text-label-mono-sm font-semibold text-primary px-2.5 py-1 rounded bg-primary-fixed uppercase tracking-wider truncate">
                      {problem.source}
                    </span>
                    <span className={`font-label-mono-sm text-label-mono-sm px-2 py-0.5 rounded flex items-center gap-1 ${
                      problem.urgencyVariant === 'error' ? 'bg-error-container text-error' :
                      problem.urgencyVariant === 'review' ? 'bg-state-review-bg text-state-review-text' :
                      'bg-state-draft-bg text-state-draft-text'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${problem.urgencyVariant === 'error' ? 'bg-error' : problem.urgencyVariant === 'review' ? 'bg-state-review-text' : 'bg-state-draft-text'}${problem.urgencyVariant === 'error' ? ' animate-ping' : ''}`} />
                      {problem.urgency}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant font-label-mono-sm text-label-mono-sm mb-3">
                    <span className="material-symbols-outlined text-sm">pin_drop</span>
                    <span>{problem.location}</span>
                    <span>•</span>
                    <span>{problem.published}</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {problem.title}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {problem.domains.map((d) => (
                      <span key={d} className="font-label-mono-sm text-label-mono-sm bg-surface-card text-on-surface-variant px-2 py-0.5 rounded">
                        {d}
                      </span>
                    ))}
                  </div>
                  <div className="bg-surface-card p-3 rounded-lg mb-4">
                    <div className="font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase mb-1">Target Outcome</div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                      {problem.outcome}
                    </p>
                  </div>
                </div>
                <div className="px-6 py-4 bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center gap-1 text-on-surface-variant font-label-mono-sm text-label-mono-sm">
                    <span className="material-symbols-outlined text-sm">attachment</span>
                    <span>{problem.files}</span>
                  </div>
                  <LinkButton
                    to="/problems"
                    variant="ghost"
                    className="font-headline-sm text-headline-sm text-primary hover:text-primary-container flex items-center gap-1"
                  >
                    View Problem
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </LinkButton>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* BOTTOM CTA BANNER */}
      <section className="w-full py-20 bg-surface-canvas relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-space-lg">
          <motion.div
            className="bg-primary rounded-2xl p-space-xl md:p-16 text-on-primary shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-secondary-container opacity-30 pointer-events-none" />
            <div className="absolute -left-16 -top-16 w-60 h-60 rounded-full bg-on-primary-container opacity-10 pointer-events-none" />
            <div className="max-w-2xl relative z-10">
              <span className="font-label-mono-sm text-label-mono-sm uppercase tracking-widest text-secondary-fixed mb-3 inline-block font-semibold">
                Join the Innovation Initiative
              </span>
              <h2 className="font-headline-lg text-display-lg md:text-display-lg text-on-primary mb-4 leading-tight">
                Ready to build and submit your solution?
              </h2>
              <p className="font-body-lg text-body-lg text-primary-fixed leading-relaxed">
                Form your university development team, connect repositories, and submit verifiable engineering prototypes to national evaluators.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-space-md w-full md:w-auto relative z-10">
              <LinkButton
                to="/problems"
                variant="secondary"
                className="h-12 px-6 w-full sm:w-auto rounded-lg bg-surface-card text-primary font-headline-sm text-headline-sm hover:bg-surface-container-low transition-colors shadow-md flex items-center justify-center text-center"
              >
                Explore All Problems
              </LinkButton>
              <LinkButton
                to="/register"
                variant="primary"
                className="h-12 px-6 w-full sm:w-auto rounded-lg bg-secondary-container text-on-secondary font-headline-sm text-headline-sm hover:bg-secondary transition-colors shadow-md flex items-center justify-center text-center"
              >
                Register as Participant
              </LinkButton>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}