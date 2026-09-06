-- V2: evaluation reference seed data (copied from monolith V13).
-- Default weights (equal-weight fallback applies if missing or sums != 1)
-- and the per-pool criteria catalog (5 criteria each, max_score 10).

INSERT INTO weight_config (evaluator_type, weight, is_default) VALUES
    ('GOVERNMENT', 0.25, TRUE),
    ('INDUSTRY',   0.15, TRUE),
    ('HEI',        0.15, TRUE),
    ('CITIZEN',    0.25, TRUE),
    ('COMMUNITY',  0.20, TRUE);

INSERT INTO evaluation_criterion (evaluator_type, criterion_key, criterion_label, description, max_score, sort_order)
VALUES
    ('GOVERNMENT', 'policy_relevance',          'Policy Relevance',          'Relevance to current national/state policy priorities.', 10, 1),
    ('GOVERNMENT', 'admin_feasibility',         'Administrative Feasibility','How implementable this is within government machinery.',   10, 2),
    ('GOVERNMENT', 'impl_feasibility',          'Implementation Feasibility','Ease/realism of implementation on the ground.',            10, 3),
    ('GOVERNMENT', 'public_impact',             'Public Impact',             'Expected breadth and depth of public benefit.',             10, 4),
    ('GOVERNMENT', 'urgency',                   'Urgency',                   'How urgent it is to act on this problem.',                   10, 5),
    ('INDUSTRY',   'tech_feasibility',          'Technology Feasibility',    'Technical solvability with current/emerging tech.',          10, 1),
    ('INDUSTRY',   'scalability',               'Scalability',               'Can a solution scale to other regions/markets.',             10, 2),
    ('INDUSTRY',   'innovation_potential',      'Innovation Potential',      'Room for novel/patentable solutions.',                       10, 3),
    ('INDUSTRY',   'impl_cost',                 'Implementation Cost',       'Estimated cost of building a solution (higher score = lower cost).', 10, 4),
    ('INDUSTRY',   'market_potential',          'Market Potential',          'Commercial/market opportunity for a solution.',              10, 5),
    ('HEI',        'tech_validity',             'Technical Validity',        'Scientific/technical soundness of addressing the problem.', 10, 1),
    ('HEI',        'research_potential',        'Research Potential',        'Potential to advance research/curriculum.',                   10, 2),
    ('HEI',        'innovation',                'Innovation',                'Degree of innovation involved.',                             10, 3),
    ('HEI',        'scientific_feasibility',    'Scientific Feasibility',    'Feasibility per scientific principles.',                     10, 4),
    ('HEI',        'knowledge_gap',             'Knowledge Gap',             'How much is unknown/under-studied about this problem.',      10, 5),
    ('CITIZEN',    'problem_importance',        'Problem Importance',        'How important this problem is for affected people.',         10, 1),
    ('CITIZEN',    'user_impact',               'Real User Impact',          'Daily-life impact on ordinary citizens.',                    10, 2),
    ('CITIZEN',    'urgency',                   'Urgency',                   'How urgent the problem feels on the ground.',                10, 3),
    ('CITIZEN',    'accessibility',             'Accessibility',             'Are solutions easy for citizens to access/use.',             10, 4),
    ('CITIZEN',    'expected_improvement',      'Expected Improvement',      'Expected quality-of-life improvement if solved.',             10, 5),
    ('COMMUNITY',  'social_impact',             'Social Impact',             'Overall social impact on the community.',                     10, 1),
    ('COMMUNITY',  'community_need',            'Community Need',            'How strongly the community needs this solved.',               10, 2),
    ('COMMUNITY',  'inclusiveness',             'Inclusiveness',             'Does the solution benefit marginalised/vulnerable groups.',   10, 3),
    ('COMMUNITY',  'community_adoption',        'Community Adoption',        'Likelihood the community adopts a solution.',                 10, 4),
    ('COMMUNITY',  'sustainability',            'Sustainability',            'Long-term environmental/social sustainability.',              10, 5);
