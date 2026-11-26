import type { ComponentType } from 'react';
import type { SiteComponentProps } from './types';

// Wave 1 (10 flagship sites)
import { SongbirdSite } from './wave1/SongbirdSite';
import { LimelightSite } from './wave1/LimelightSite';
import { GlasslineDesignsSite } from './wave1/GlasslineDesignsSite';
import { SilverleafStadiumSite } from './wave1/SilverleafStadiumSite';
import { WillowWhisperSite } from './wave1/WillowWhisperSite';
import { MirroraStudiosSite } from './wave1/MirroraStudiosSite';
import { MmrsSite } from './wave1/MmrsSite';
import { PerformersAssocSite } from './wave1/PerformersAssocSite';
import { OpenCallCastingSite } from './wave1/OpenCallCastingSite';
import { MarlieRecordsSite } from './wave1/MarlieRecordsSite';

// Wave 2 (6 music, club, management & PR sites)
import { PopStickerRadioSite } from './wave2/PopStickerRadioSite';
import { KajiPublishingSite } from './wave2/KajiPublishingSite';
import { LunerumDistSite } from './wave2/LunerumDistSite';
import { LookingGlassSite } from './wave2/LookingGlassSite';
import { SecondActSite } from './wave2/SecondActSite';
import { WordOfMouthSite } from './wave2/WordOfMouthSite';

// Wave 3 (9 touring, beauty, portrait, dance, animation, theatre, awards & major agency sites)
import { VelvetCurtainSite } from './wave3/VelvetCurtainSite';
import { AmrielleSite } from './wave3/AmrielleSite';
import { RosemontPortraitSite } from './wave3/RosemontPortraitSite';
import { FemmeFataleSite } from './wave3/FemmeFataleSite';
import { WonderWindSite } from './wave3/WonderWindSite';
import { StoryloomStudiosSite } from './wave3/StoryloomStudiosSite';
import { MarigoldTheatreSite } from './wave3/MarigoldTheatreSite';
import { RadianceAwardsSite } from './wave3/RadianceAwardsSite';
import { StarstruckSite } from './wave3/StarstruckSite';

export const ENTERTAINMENT_SITE_REGISTRY: Readonly<Record<string, ComponentType<SiteComponentProps>>> = {
  // Wave 1
  ORG_SONGBIRD: SongbirdSite,
  ORG_LIMELIGHT: LimelightSite,
  ORG_GLASSLINE_DESIGNS: GlasslineDesignsSite,
  ORG_SILVERLEAF_STADIUM: SilverleafStadiumSite,
  ORG_WILLOW_WHISPER: WillowWhisperSite,
  ORG_MIRRORA_STUDIOS: MirroraStudiosSite,
  ORG_MUSIC_RIGHTS_SOCIETY: MmrsSite,
  ORG_PERFORMERS_ASSOC: PerformersAssocSite,
  ORG_OPEN_CALL: OpenCallCastingSite,
  ORG_MARLIE_RECORDS: MarlieRecordsSite,

  // Wave 2
  ORG_POP_STICKER: PopStickerRadioSite,
  ORG_KAJI_PUBLISHING: KajiPublishingSite,
  ORG_LUNERUM_DIST: LunerumDistSite,
  ORG_LOOKING_GLASS: LookingGlassSite,
  ORG_SECOND_ACT: SecondActSite,
  ORG_WORD_OF_MOUTH: WordOfMouthSite,

  // Wave 3
  ORG_VELVET_CURTAIN: VelvetCurtainSite,
  ORG_AMRIELLE: AmrielleSite,
  ORG_ROSEMONT_PORTRAIT: RosemontPortraitSite,
  ORG_FEMME_FATALE: FemmeFataleSite,
  ORG_WONDER_WIND: WonderWindSite,
  ORG_STORYLOOM_STUDIOS: StoryloomStudiosSite,
  ORG_MARIGOLD_THEATRE: MarigoldTheatreSite,
  ORG_RADIANCE_AWARDS: RadianceAwardsSite,
  ORG_STARSTRUCK: StarstruckSite,
};
