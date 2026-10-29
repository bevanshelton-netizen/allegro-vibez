# ALLEGRO-VIBEZ — Radio World + Festival World Data Schema v1

## RADIO WORLD
Each station/opportunity record should support:

- station_id
- station_name
- country
- territory/city
- timezone
- website
- format
- genres
- subgenres
- language
- audience_description
- submission_url_or_method
- public_programmer_contact
- premiere_opportunity
- interview_opportunity
- syndicated_show_opportunity
- music_exchange_opportunity
- partnership_status
- rights/permission_notes
- last_contact_at
- next_action_at
- owner
- notes

### Partnership states
`prospect → contacted → responding → discussion → pilot → confirmed partner → inactive`

Only **confirmed partner** may be displayed publicly as an ALLEGRO-VIBEZ partner.

## FESTIVAL WORLD
Each festival/opportunity record should support:

- festival_id
- festival_name
- country
- city
- dates
- genres
- subgenres
- festival_type
- opportunity_class
- emerging/showcase/major classification
- official_url
- official_application_route
- deadline
- application_requirements
- performance_requirements
- fees
- travel_information
- accommodation_information
- booking_contact
- industry_programme
- artist_fit_score
- submission_status
- last_action_at
- next_action_at
- owner
- notes

### Submission states
`identified → fit-reviewed → ready → submitted → follow-up → shortlisted → confirmed → declined → closed`

A submission must never be labelled confirmed without evidence of acceptance.

## Artist matching
Matching can consider genre, subgenre, territory, audience, language, career stage, live format, availability and festival requirements.

## Rights-safe boundary
Radio and festival records describe opportunities and relationships. They do not grant music licences, transfer rights or create royalty obligations by themselves.
