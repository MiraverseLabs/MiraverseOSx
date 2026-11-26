-- ============================================================================
-- MiraverseOSx — Phase 2 Persistent Entertainment Relational Schema
-- Additive, versioned, non-destructive tables complementing:
--   Characters, EntertainmentOrganizations, WorldRecords,
--   LivingWorldRuns, and LivingWorldTransactions.
-- Covers all 14 logical entertainment categories:
--   1. Industry workforce        (EntertainmentArtists, EntertainmentStaff)
--   2. Representation            (EntertainmentContracts)
--   3. Music                     (EntertainmentTracks, EntertainmentReleases)
--   4. Intellectual property     (EntertainmentRights)
--   5. Revenue                   (EntertainmentRevenueLedger)
--   6. Productions               (EntertainmentProductions)
--   7. Casting                   (EntertainmentAuditions, EntertainmentAuditionApplications)
--   8. Live events               (EntertainmentVenues, EntertainmentConcerts, EntertainmentTickets)
--   9. Publicity                 (EntertainmentMediaItems, EntertainmentCampaigns, EntertainmentControversies)
--  10. Fashion                   (EntertainmentFashionItems)
--  11. Photography               (EntertainmentPhotoSessions)
--  12. Fandom                    (EntertainmentFanCommunities)
--  13. Awards                    (EntertainmentAwardCycles, EntertainmentAwardNominations)
--  14. Professional development  (EntertainmentTrainingRecords)
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 8a. Canonical Live Event Venues (single source of truth replacing STAGE_VENUES / VENUE_CATALOG hardcoding)
CREATE TABLE IF NOT EXISTS EntertainmentVenues (
    VenueOrgId TEXT PRIMARY KEY,
    LocationId TEXT,
    Name TEXT NOT NULL UNIQUE,
    District TEXT NOT NULL,
    Realm TEXT NOT NULL DEFAULT 'Orynvell',
    Capacity INTEGER NOT NULL CHECK(Capacity > 0),
    MinRecognitionRequired REAL NOT NULL DEFAULT 0.0,
    RentalCostCredits REAL NOT NULL DEFAULT 0.0,
    DefaultTicketPrice REAL NOT NULL DEFAULT 18.0,
    DataJson TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(DataJson)),
    UpdatedAt TEXT NOT NULL
);

-- 1a. Industry Workforce — Artists (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentArtists (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    ArtistId TEXT NOT NULL,
    CharacterId TEXT NOT NULL DEFAULT '',
    StageName TEXT NOT NULL,
    Origin TEXT NOT NULL DEFAULT 'npc',
    CareerStatus TEXT NOT NULL DEFAULT 'active',
    PrivacyBoundary TEXT NOT NULL DEFAULT 'guarded',
    Tier TEXT NOT NULL DEFAULT 'Emerging Newcomer',
    GuildMember INTEGER NOT NULL DEFAULT 0,
    ManagerOrgId TEXT NOT NULL DEFAULT '',
    LabelOrgId TEXT NOT NULL DEFAULT '',
    PublisherOrgId TEXT NOT NULL DEFAULT '',
    PrOrgId TEXT NOT NULL DEFAULT '',
    DistributorOrgId TEXT NOT NULL DEFAULT '',
    Recognition REAL NOT NULL DEFAULT 0.0,
    Favorability REAL NOT NULL DEFAULT 50.0,
    IndustryReputation REAL NOT NULL DEFAULT 30.0,
    FanLoyalty REAL NOT NULL DEFAULT 10.0,
    ArtisticCredibility REAL NOT NULL DEFAULT 15.0,
    CommercialInfluence REAL NOT NULL DEFAULT 5.0,
    CulturalInfluence REAL NOT NULL DEFAULT 5.0,
    MediaVisibility REAL NOT NULL DEFAULT 5.0,
    FanCount INTEGER NOT NULL DEFAULT 0,
    MonthlyListeners INTEGER NOT NULL DEFAULT 0,
    TotalRoyaltiesEarned REAL NOT NULL DEFAULT 0.0,
    TotalBoxOfficeEarned REAL NOT NULL DEFAULT 0.0,
    UnclaimedPlayerRoyalties REAL NOT NULL DEFAULT 0.0,
    DisciplinesJson TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(DisciplinesJson)),
    GenresJson TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(GenresJson)),
    Bio TEXT NOT NULL DEFAULT '',
    LastActiveDay INTEGER NOT NULL DEFAULT 0,
    UpdatedAt TEXT NOT NULL,
    PRIMARY KEY (RunId, ArtistId)
);

-- 1b. Industry Workforce — Staff, Agents, Managers, Crews (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentStaff (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    StaffId TEXT NOT NULL,
    CharacterId TEXT NOT NULL DEFAULT '',
    Name TEXT NOT NULL,
    OrganizationId TEXT NOT NULL DEFAULT '',
    CareerFamily TEXT NOT NULL DEFAULT 'production',
    RoleTitle TEXT NOT NULL DEFAULT '',
    EmploymentKind TEXT NOT NULL DEFAULT 'staff',
    SkillLevel REAL NOT NULL DEFAULT 50.0,
    Status TEXT NOT NULL DEFAULT 'active',
    DataJson TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(DataJson)),
    UpdatedAt TEXT NOT NULL,
    PRIMARY KEY (RunId, StaffId)
);

-- 2. Representation — Contracts, Memberships, Agencies, Obligations (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentContracts (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    ContractId TEXT NOT NULL,
    ArtistId TEXT NOT NULL,
    OrganizationId TEXT NOT NULL,
    ContractType TEXT NOT NULL,
    CommissionRate REAL NOT NULL DEFAULT 0.0,
    RoyaltySplitArtist REAL NOT NULL DEFAULT 0.80,
    AdvanceCredits REAL NOT NULL DEFAULT 0.0,
    ObligationCount INTEGER NOT NULL DEFAULT 0,
    CompletedObligations INTEGER NOT NULL DEFAULT 0,
    StartDay INTEGER NOT NULL DEFAULT 0,
    ExpiresDay INTEGER NOT NULL DEFAULT 0,
    Status TEXT NOT NULL DEFAULT 'active',
    DataJson TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(DataJson)),
    PRIMARY KEY (RunId, ContractId)
);

-- 3a. Music — Compositions, Recordings, Tracks (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentTracks (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    TrackId TEXT NOT NULL,
    ArtistId TEXT NOT NULL,
    StageName TEXT NOT NULL DEFAULT '',
    Title TEXT NOT NULL,
    Kind TEXT NOT NULL DEFAULT 'single',
    Genre TEXT NOT NULL DEFAULT '',
    DurationSeconds INTEGER NOT NULL DEFAULT 180,
    AudioUrl TEXT NOT NULL DEFAULT '',
    CoverArtUrl TEXT NOT NULL DEFAULT '',
    ProducerOrgId TEXT NOT NULL DEFAULT '',
    PublisherOrgId TEXT NOT NULL DEFAULT '',
    MmrsRegistered INTEGER NOT NULL DEFAULT 0,
    MasterOwnedByArtist INTEGER NOT NULL DEFAULT 1,
    Quality REAL NOT NULL DEFAULT 60.0,
    Streams INTEGER NOT NULL DEFAULT 0,
    RadioSpins INTEGER NOT NULL DEFAULT 0,
    CreatedDay INTEGER NOT NULL DEFAULT 0,
    DataJson TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(DataJson)),
    PRIMARY KEY (RunId, TrackId)
);

-- 3b. Music — Albums, EPs, Singles, Releases (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentReleases (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    ReleaseId TEXT NOT NULL,
    TrackId TEXT NOT NULL DEFAULT '',
    ArtistId TEXT NOT NULL,
    Title TEXT NOT NULL,
    Format TEXT NOT NULL DEFAULT 'Single',
    DistributorOrgId TEXT NOT NULL DEFAULT '',
    LabelOrgId TEXT NOT NULL DEFAULT '',
    PlatformOrgId TEXT NOT NULL DEFAULT 'ORG_SONGBIRD',
    ScheduledDay INTEGER NOT NULL DEFAULT 0,
    ReleasedDay INTEGER,
    RoyaltyRate REAL NOT NULL DEFAULT 0.14,
    Status TEXT NOT NULL DEFAULT 'scheduled',
    DataJson TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(DataJson)),
    PRIMARY KEY (RunId, ReleaseId)
);

-- 4. Intellectual Property — Rights Holders, Ownership Shares, Licenses (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentRights (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    RightId TEXT NOT NULL,
    WorkType TEXT NOT NULL DEFAULT 'track',
    WorkId TEXT NOT NULL,
    RightsHolderType TEXT NOT NULL DEFAULT 'artist',
    RightsHolderId TEXT NOT NULL,
    RightCategory TEXT NOT NULL DEFAULT 'master',
    OwnershipSharePct REAL NOT NULL CHECK(OwnershipSharePct >= 0.0 AND OwnershipSharePct <= 100.0),
    MmrsRegistered INTEGER NOT NULL DEFAULT 0,
    LicenseTerms TEXT NOT NULL DEFAULT '',
    UpdatedAt TEXT NOT NULL,
    PRIMARY KEY (RunId, RightId)
);

-- 5. Revenue — Streams, Royalty Statements, Settlements, Commissions (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentRevenueLedger (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    EntryId TEXT NOT NULL,
    ArtistId TEXT NOT NULL DEFAULT '',
    CharacterId TEXT NOT NULL DEFAULT '',
    OrganizationId TEXT NOT NULL DEFAULT '',
    SourceEntityId TEXT NOT NULL DEFAULT '',
    Kind TEXT NOT NULL,
    GrossAmount REAL NOT NULL DEFAULT 0.0,
    NetAmount REAL NOT NULL DEFAULT 0.0,
    DayIndex INTEGER NOT NULL DEFAULT 0,
    Description TEXT NOT NULL DEFAULT '',
    CreatedAt TEXT NOT NULL,
    PRIMARY KEY (RunId, EntryId)
);

-- 6. Productions — Films, Series, Animation, Theatre, Dance Works (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentProductions (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    ProductionId TEXT NOT NULL,
    Title TEXT NOT NULL,
    Kind TEXT NOT NULL DEFAULT 'film',
    StudioOrgId TEXT NOT NULL DEFAULT '',
    DirectorOrLeadId TEXT NOT NULL DEFAULT '',
    Stage TEXT NOT NULL DEFAULT 'development',
    Progress REAL NOT NULL DEFAULT 0.0,
    BudgetCredits REAL NOT NULL DEFAULT 0.0,
    Quality REAL NOT NULL DEFAULT 70.0,
    Status TEXT NOT NULL DEFAULT 'in_production',
    DataJson TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(DataJson)),
    PRIMARY KEY (RunId, ProductionId)
);

-- 7a. Casting — Casting Calls & Roles (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentAuditions (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    AuditionId TEXT NOT NULL,
    Title TEXT NOT NULL,
    OrgId TEXT NOT NULL DEFAULT '',
    ProductionOrgId TEXT NOT NULL DEFAULT '',
    Discipline TEXT NOT NULL DEFAULT 'acting',
    MinCredibility REAL NOT NULL DEFAULT 0.0,
    StipendCredits REAL NOT NULL DEFAULT 0.0,
    DeadlineDay INTEGER NOT NULL DEFAULT 0,
    SelectedArtistId TEXT NOT NULL DEFAULT '',
    Status TEXT NOT NULL DEFAULT 'open',
    DataJson TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(DataJson)),
    PRIMARY KEY (RunId, AuditionId)
);

-- 7b. Casting — Applications, Callbacks, Bookings (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentAuditionApplications (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    AuditionId TEXT NOT NULL,
    ArtistId TEXT NOT NULL,
    StageName TEXT NOT NULL DEFAULT '',
    Score REAL NOT NULL DEFAULT 0.0,
    SubmittedDay INTEGER NOT NULL DEFAULT 0,
    Booked INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (RunId, AuditionId, ArtistId)
);

-- 8b. Live Events — Performances & Tours (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentConcerts (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    ConcertId TEXT NOT NULL,
    ArtistId TEXT NOT NULL,
    StageName TEXT NOT NULL DEFAULT '',
    Title TEXT NOT NULL,
    VenueName TEXT NOT NULL,
    VenueOrgId TEXT NOT NULL DEFAULT '',
    PromoterOrgId TEXT NOT NULL DEFAULT '',
    ScheduledDay INTEGER NOT NULL DEFAULT 0,
    Slot TEXT NOT NULL DEFAULT 'evening',
    TicketPrice REAL NOT NULL DEFAULT 18.0,
    Capacity INTEGER NOT NULL DEFAULT 180,
    RentalCost REAL NOT NULL DEFAULT 65.0,
    TicketsSold INTEGER NOT NULL DEFAULT 0,
    GrossRevenue REAL NOT NULL DEFAULT 0.0,
    NetArtistPayout REAL NOT NULL DEFAULT 0.0,
    ReviewScore REAL,
    Status TEXT NOT NULL DEFAULT 'scheduled',
    DataJson TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(DataJson)),
    PRIMARY KEY (RunId, ConcertId)
);

-- 8c. Live Events — Ticket Receipts & Attendance (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentTickets (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    TicketId TEXT NOT NULL,
    ConcertId TEXT NOT NULL,
    BuyerCharacterId TEXT NOT NULL DEFAULT '',
    BuyerName TEXT NOT NULL DEFAULT '',
    Quantity INTEGER NOT NULL DEFAULT 1,
    PricePaid REAL NOT NULL DEFAULT 0.0,
    PurchasedDay INTEGER NOT NULL DEFAULT 0,
    Attended INTEGER NOT NULL DEFAULT 0,
    DataJson TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(DataJson)),
    PRIMARY KEY (RunId, TicketId)
);

-- 9a. Publicity — Press Releases, Interviews, Reviews, Features (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentMediaItems (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    MediaId TEXT NOT NULL,
    OrgId TEXT NOT NULL DEFAULT '',
    Kind TEXT NOT NULL DEFAULT 'feature',
    Headline TEXT NOT NULL,
    Summary TEXT NOT NULL DEFAULT '',
    Sentiment TEXT NOT NULL DEFAULT 'positive',
    DayIndex INTEGER NOT NULL DEFAULT 0,
    SubjectArtistIdsJson TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(SubjectArtistIdsJson)),
    DataJson TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(DataJson)),
    PRIMARY KEY (RunId, MediaId)
);

-- 9b. Publicity — Sponsorships & Promotional Campaigns (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentCampaigns (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    CampaignId TEXT NOT NULL,
    ArtistId TEXT NOT NULL DEFAULT '',
    SponsorOrgId TEXT NOT NULL DEFAULT '',
    CampaignTitle TEXT NOT NULL,
    Kind TEXT NOT NULL DEFAULT 'sponsorship',
    FeeCredits REAL NOT NULL DEFAULT 0.0,
    StartDay INTEGER NOT NULL DEFAULT 0,
    Status TEXT NOT NULL DEFAULT 'active',
    DataJson TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(DataJson)),
    PRIMARY KEY (RunId, CampaignId)
);

-- 9c. Publicity — Controversies & Crisis Responses (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentControversies (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    ControversyId TEXT NOT NULL,
    ArtistId TEXT NOT NULL DEFAULT '',
    StageName TEXT NOT NULL DEFAULT '',
    Headline TEXT NOT NULL,
    Severity TEXT NOT NULL DEFAULT 'moderate',
    Status TEXT NOT NULL DEFAULT 'open',
    PrOrgId TEXT NOT NULL DEFAULT '',
    DayIndex INTEGER NOT NULL DEFAULT 0,
    DataJson TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(DataJson)),
    PRIMARY KEY (RunId, ControversyId)
);

-- 10. Fashion — Collections, Models, Campaigns, Runway Bookings (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentFashionItems (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    FashionItemId TEXT NOT NULL,
    OrganizationId TEXT NOT NULL DEFAULT '',
    ArtistId TEXT NOT NULL DEFAULT '',
    Kind TEXT NOT NULL DEFAULT 'collection',
    Title TEXT NOT NULL,
    Season TEXT NOT NULL DEFAULT '',
    FeeCredits REAL NOT NULL DEFAULT 0.0,
    Status TEXT NOT NULL DEFAULT 'active',
    DataJson TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(DataJson)),
    PRIMARY KEY (RunId, FashionItemId)
);

-- 11. Photography — Sessions, Commissions, Portfolios, Deliverables (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentPhotoSessions (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    SessionId TEXT NOT NULL,
    StudioOrgId TEXT NOT NULL DEFAULT 'ORG_ROSEMONT_PORTRAIT',
    SubjectArtistId TEXT NOT NULL DEFAULT '',
    Title TEXT NOT NULL,
    CommissionKind TEXT NOT NULL DEFAULT 'editorial',
    DeliverableAssetPath TEXT NOT NULL DEFAULT '',
    Status TEXT NOT NULL DEFAULT 'scheduled',
    DayIndex INTEGER NOT NULL DEFAULT 0,
    DataJson TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(DataJson)),
    PRIMARY KEY (RunId, SessionId)
);

-- 12. Fandom — Communities, Follows, Engagement, Preferences (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentFanCommunities (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    CommunityId TEXT NOT NULL,
    ArtistId TEXT NOT NULL,
    StageName TEXT NOT NULL DEFAULT '',
    Name TEXT NOT NULL,
    MemberCount INTEGER NOT NULL DEFAULT 0,
    LoyaltyScore REAL NOT NULL DEFAULT 25.0,
    RecentActivity TEXT NOT NULL DEFAULT '',
    MemberIdsJson TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(MemberIdsJson)),
    PRIMARY KEY (RunId, CommunityId)
);

-- 13a. Awards — Ceremony Cycles & Eligibility Windows (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentAwardCycles (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    AwardCycleId TEXT NOT NULL,
    Year INTEGER NOT NULL DEFAULT 0,
    CeremonyDay INTEGER NOT NULL DEFAULT 0,
    Status TEXT NOT NULL DEFAULT 'open',
    DataJson TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(DataJson)),
    PRIMARY KEY (RunId, AwardCycleId)
);

-- 13b. Awards — Categories, Nominations & Winners (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentAwardNominations (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    AwardCycleId TEXT NOT NULL,
    Category TEXT NOT NULL,
    ArtistId TEXT NOT NULL,
    StageName TEXT NOT NULL DEFAULT '',
    WorkTitle TEXT NOT NULL DEFAULT '',
    Score REAL NOT NULL DEFAULT 0.0,
    IsWinner INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (RunId, AwardCycleId, Category, ArtistId)
);

-- 14. Professional Development — Training, Workshops, Qualifications, Experience (run-scoped)
CREATE TABLE IF NOT EXISTS EntertainmentTrainingRecords (
    RunId TEXT NOT NULL REFERENCES LivingWorldRuns(RunId) ON DELETE CASCADE,
    TrainingId TEXT NOT NULL,
    CharacterId TEXT NOT NULL DEFAULT '',
    ArtistId TEXT NOT NULL DEFAULT '',
    Discipline TEXT NOT NULL,
    ProgramTitle TEXT NOT NULL DEFAULT '',
    ProviderOrgId TEXT NOT NULL DEFAULT '',
    Xp INTEGER NOT NULL DEFAULT 0,
    Level INTEGER NOT NULL DEFAULT 1,
    CompletedWorks INTEGER NOT NULL DEFAULT 0,
    Qualification TEXT NOT NULL DEFAULT '',
    UpdatedAt TEXT NOT NULL,
    PRIMARY KEY (RunId, TrainingId)
);

-- Indexes for fast per-run queries
CREATE INDEX IF NOT EXISTS idx_ent_artists_run_char ON EntertainmentArtists(RunId, CharacterId);
CREATE INDEX IF NOT EXISTS idx_ent_contracts_run_artist ON EntertainmentContracts(RunId, ArtistId, Status);
CREATE INDEX IF NOT EXISTS idx_ent_tracks_run_artist ON EntertainmentTracks(RunId, ArtistId);
CREATE INDEX IF NOT EXISTS idx_ent_releases_run_status ON EntertainmentReleases(RunId, Status);
CREATE INDEX IF NOT EXISTS idx_ent_rights_run_work ON EntertainmentRights(RunId, WorkId);
CREATE INDEX IF NOT EXISTS idx_ent_revenue_run_artist ON EntertainmentRevenueLedger(RunId, ArtistId, DayIndex DESC);
CREATE INDEX IF NOT EXISTS idx_ent_productions_run_status ON EntertainmentProductions(RunId, Status);
CREATE INDEX IF NOT EXISTS idx_ent_auditions_run_status ON EntertainmentAuditions(RunId, Status);
CREATE INDEX IF NOT EXISTS idx_ent_concerts_run_venue_day ON EntertainmentConcerts(RunId, VenueOrgId, ScheduledDay, Slot);
CREATE INDEX IF NOT EXISTS idx_ent_tickets_run_concert ON EntertainmentTickets(RunId, ConcertId);
CREATE INDEX IF NOT EXISTS idx_ent_media_run_day ON EntertainmentMediaItems(RunId, DayIndex DESC);
CREATE INDEX IF NOT EXISTS idx_ent_awards_run_cycle ON EntertainmentAwardNominations(RunId, AwardCycleId, IsWinner);
CREATE INDEX IF NOT EXISTS idx_ent_training_run_artist ON EntertainmentTrainingRecords(RunId, ArtistId, Discipline);

-- Convenience read view joining canonical venues with EntertainmentOrganizations
CREATE VIEW IF NOT EXISTS BrowseEntertainmentVenues AS
SELECT
    v.VenueOrgId,
    v.LocationId,
    v.Name,
    v.District,
    v.Realm,
    v.Capacity,
    v.MinRecognitionRequired,
    v.RentalCostCredits,
    v.DefaultTicketPrice,
    o.Domain,
    o.Tagline
FROM EntertainmentVenues v
LEFT JOIN EntertainmentOrganizations o ON o.OrganizationId = v.VenueOrgId;
