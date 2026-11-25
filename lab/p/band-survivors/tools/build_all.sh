#!/usr/bin/env bash
# Rebuild every Band Survivors level from its song set (the songs on D:). One make_level.py call per song.
set -e
cd "$(dirname "$0")/.."
M="python tools/make_level.py"
P=D:/music-battler-work/songs
$M --set $P/sneaky_parts/set_clean --lead-wav $P/sneaky_parts/set_clean_dry/voice_lead.wav --id sneaky --title "Sneaky Harbour" --order 1 --diff 1 \
  --enemies p_cabin,p_seal,p_pogo,p_mate,p_lock,p_commodore,p_cutlass --elites p_brig,p_purser --boss p_chief \
  --ground "#1E524C" --accent "#FF5FA2" --source "Suno clip bd151f71 (Sneaky)"
$M --set $P/picks/a1_out/set --id day-lawn --title "Day Lawn" --order 2 --diff 2 \
  --enemies glad_hummer,tiny_peep,rite_singer,tomorrow_soprano,fungal_sage,rooster_herald --elites bell_bear,big_hat_brigand --boss gong_golem \
  --ground "#2F6E45" --accent "#FFD84A" --source "Suno clip 18b55201 (Day lawn A, take 1)"
$M --set $P/pl116/canal_idea1_out/set --lead-pair brass --id canal --title "Canal" --order 3 --diff 3 \
  --enemies seaweed_steward,reef_augur,silt_hummer,island_whistler,cart_hand,drone_scout --elites shackled_hand,cutlass_baritone --boss dread_fundamental \
  --ground "#1F5A6E" --accent "#7FE3FF" --source "Pull Lanes canal, idea 1, at 116"
$M --set $P/picks/b1_out/set --id night-market --title "Night Market" --order 4 --diff 4 \
  --enemies dusk_stalker_alto,night_murk,shadow_cantor,omen_cantor,twin_throat,masked_hummer,void_courier --elites pallbearer_chant,marrow_psalmist --boss pit_bellower \
  --ground "#2B2350" --accent "#C9A2FF" --source "Suno clip 5b50ffee (Night B, take 1)"
$M --set $P/picks/f1_out/set --id harbour-fog --title "Harbour Fog" --order 5 --diff 5 \
  --enemies fog_choir,drifting_throat,ghost_overtone,whisper_abyss,veiled_kargyraa,abyss_precentor --elites harbor_taxman,grasping_purser --boss tine_toad \
  --ground "#36505A" --accent "#BFE8F0" --source "Suno clip 008465a1 (Harbour fog B, take 1)"
$M --set $P/pl116/rooftop_idea4_out/set --id rooftops --title "Rooftops" --order 6 --diff 6 \
  --enemies rain_step_singer,drainpipe_runaway,tok_echo,sharp_harmonic,frost_throat,overtone_lancer --elites tower_knell,watchtower_soprano --boss thunder_ox \
  --ground "#44506A" --accent "#FFB347" --source "Pull Lanes rooftop, idea 4, at 116"
$M --set $P/pl116/night_idea2_out/set --lead-pair brass --id lantern-night --title "Lantern Night" --order 7 --diff 7 \
  --enemies tok_ember,warm_dirge,forge_riser,elegy_teller,ever_cantor,gilded_chanter --elites reliquary_cantor,requiem_copyist --boss crimson_knell \
  --ground "#3A2340" --accent "#FF8A3D" --source "Pull Lanes night, idea 2, at 116"
$M --set $P/pl116/fog_idea1_out/set --id marsh --title "Marsh" --order 8 --diff 8 \
  --enemies mire_gatherer,murk_singer,acid_gargler,lazy_drone,drone_feeder,clinging_hum,dirge_spinner --elites chamber_droner,scythe_hand --boss bulwark_keener \
  --ground "#2E4A3A" --accent "#9AF3FF" --source "Pull Lanes harbour fog, idea 1, at 116"
$M --set $P/pl116/daylawn_idea2_out/set --id bell-garden --title "Bell Garden" --order 9 --diff 9 \
  --enemies bell_teacher,bellows_imp,circle_caller,toll_counter,tally_singer,split_takings --elites growl_cantor,heartsick_crooner --boss gong_golem \
  --ground "#5A4A2A" --accent "#FFE680" --source "Pull Lanes day lawn, idea 2, at 116"
echo ALL_LEVELS_DONE
