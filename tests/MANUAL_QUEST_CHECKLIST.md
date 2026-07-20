# Manual Meta Quest test checklist

Record the headset model, Quest OS version, Quest Browser version, deployed HTTPS URL, tester and date before starting.

## Preparation and entry

- [ ] Clear this site's stored data for a true first-load check, then open its HTTPS URL with Wi-Fi enabled.
- [ ] Confirm the lab appears without a blank screen, blocking error or external sign-in.
- [ ] Wait until **Offline ready** appears both in the browser overlay and on the floating panel.
- [ ] Select **Enter VR** and confirm immersive mode starts at a comfortable, stationary viewpoint.
- [ ] Check that the source, holder, GM tube, rack, all controls, legend and scale notice can be seen without locomotion.
- [ ] Test once while seated and once while standing. Confirm there is no artificial camera motion, rapid flashing or need to lean unsafely.
- [ ] Confirm the control labels and GM display are comfortably readable at the default distance.

## Controllers and control panel

- [ ] With the left controller, point its ray at Alpha and press the trigger. Confirm the button and `[ON]`/`[OFF]` text change.
- [ ] With the right controller, repeat on Beta. Confirm both controller rays select buttons reliably.
- [ ] Test Gamma, Paths, Sound, No shield and Reset with a mix of left and right controllers.
- [ ] Try to turn off the only active radiation type. Confirm it remains on and a clear message appears.
- [ ] Confirm selected controls differ by state text and border/panel appearance, not colour alone.

## All seven source combinations

For each row, confirm the control panel, separate visual lanes, GM source line and live explanation lines agree. Wait at least three one-second readings per row.

- [ ] Alpha only.
- [ ] Beta only.
- [ ] Gamma only.
- [ ] Alpha + Beta.
- [ ] Alpha + Gamma.
- [ ] Beta + Gamma.
- [ ] Alpha + Beta + Gamma.
- [ ] Confirm adding a source generally raises the rolling average after several seconds; allow for random one-second fluctuation.

## Shield grab, snap and replacement

- [ ] Point at paper, hold the trigger, move the ray to the centre holder and release. Confirm paper snaps in and the label says `PAPER`.
- [ ] Remove paper with **No shield**. Confirm it returns exactly to its rack position.
- [ ] Insert aluminium and confirm it is visibly thicker and metallic.
- [ ] Insert lead and confirm it is visibly the thickest, heaviest-looking block.
- [ ] With paper installed, insert aluminium. Confirm paper automatically returns to its own rack position and only aluminium occupies the holder.
- [ ] With aluminium installed, insert lead. Confirm aluminium returns and only lead occupies the holder.
- [ ] Grab each material and release it well away from the holder. Confirm it safely returns to its rack.
- [ ] Grab the active material out of the holder and release it away. Confirm the state becomes `NO SHIELD` and the material returns to the rack.

## Shielding outcomes and detector

- [ ] Select Alpha only, insert paper and wait 10 seconds. Confirm alpha visuals stop at paper while occasional background counts remain possible.
- [ ] Select Beta only with paper. Confirm most beta visuals pass and the explanation says beta mostly passed.
- [ ] Keep Beta only, replace paper with aluminium and wait 10 seconds. Confirm beta is strongly reduced visually and numerically.
- [ ] Select Gamma only with aluminium. Confirm most gamma wave packets pass.
- [ ] Keep Gamma only, insert lead and wait 10 seconds. Confirm gamma is substantially attenuated but some packets and a non-zero expected count remain.
- [ ] Confirm the main number updates about once per second and the rolling average changes more smoothly.
- [ ] Confirm the display shows the most recent one-second count, cps, rolling average, active shield and selected sources.
- [ ] Confirm no wording claims the GM tube identifies individual radiation types.

## Paths, sound and reset

- [ ] With all three sources active, turn Paths off. Confirm all particles continue moving, trails disappear and the GM reading continues updating.
- [ ] Turn Paths on. Confirm alpha has a solid trail, beta a dashed trail and gamma a wave-like trail.
- [ ] Insert a blocking shield and confirm an absorbed particle's trail stops/disappears at the shield rather than continuing to the detector.
- [ ] Select **Enable sound** after entering VR. Confirm short Geiger clicks are audible.
- [ ] Use all sources with no shield. Confirm the audio stays intelligible and capped while the numerical reading remains higher and uncapped.
- [ ] Turn sound off and on. Confirm numerical counts are unaffected.
- [ ] Change several controls and insert lead, then press Reset. Confirm Alpha only, no shield, paths on, sound on and cleared/restarted readings.

## Offline launch

- [ ] Exit VR and close the browser tab after **Offline ready** was shown.
- [ ] Turn Quest Wi-Fi off.
- [ ] Reopen the installed PWA, home shortcut or exact bookmarked URL.
- [ ] Confirm the complete lab loads without a network error and A-Frame, text, icons and all scripts work.
- [ ] Enter VR offline and repeat one radiation toggle, one shield insertion, Paths and Reset.
- [ ] Restore Wi-Fi after testing.

## Sign-off

- [ ] No blocking console errors were observed through remote debugging, if available.
- [ ] Quest frame rate stayed comfortable during Alpha + Beta + Gamma with paths on.
- [ ] Both controllers, all controls and all three materials were reliable for at least three repetitions.
- [ ] Any failure, headset/browser version and reproduction steps have been recorded before classroom use.
