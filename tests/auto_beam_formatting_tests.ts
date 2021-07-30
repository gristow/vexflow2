// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
// MIT License
//
// Auto Beaming Tests

/* eslint-disable */
// @ts-nocheck

import { VexFlowTests, TestOptions, concat } from './vexflow_test_helpers';
import { QUnit, equal, ok } from './declarations';
import { Stem } from 'stem';
import { Fraction } from 'fraction';
import { Beam } from 'beam';

const AutoBeamFormattingTests = {
  Start(): void {
    QUnit.module('Auto-Beaming');
    const runTests = VexFlowTests.runTests;
    runTests('Simple Auto Beaming', this.simpleAuto);
    runTests('Auto Beaming With Overflow Group', this.simpleAutoWithOverflowGroup);
    runTests('Even Group Stem Directions', this.evenGroupStemDirections);
    runTests('Odd Group Stem Directions', this.oddGroupStemDirections);
    runTests('Odd Beam Groups Auto Beaming', this.oddBeamGroups);
    runTests('More Simple Auto Beaming 0', this.moreSimple0);
    runTests('More Simple Auto Beaming 1', this.moreSimple1);
    runTests('Beam Across All Rests', this.beamAcrossAllRests);
    runTests('Beam Across All Rests with Stemlets', this.beamAcrossAllRestsWithStemlets);
    runTests('Break Beams on Middle Rests Only', this.beamAcrossMiddleRests);
    runTests('Break Beams on Rest', this.breakBeamsOnRests);
    runTests('Maintain Stem Directions', this.maintainStemDirections);
    runTests('Maintain Stem Directions - Beam Over Rests', this.maintainStemDirectionsBeamAcrossRests);
    runTests('Beat group with unbeamable note - 2/2', this.groupWithUnbeamableNote);
    runTests('Offset beat grouping - 6/8 ', this.groupWithUnbeamableNote1);
    runTests('Odd Time - Guessing Default Beam Groups', this.autoOddBeamGroups);
    runTests('Custom Beam Groups', this.customBeamGroups);
    runTests('Simple Tuplet Auto Beaming', this.simpleTuplets);
    runTests('More Simple Tuplet Auto Beaming', this.moreSimpleTuplets);
    runTests('More Automatic Beaming', this.moreBeaming);
    runTests('Automatic Beaming 4/4 with  3, 3, 2 Pattern', this.beamingWithSeveralGroups1);
    runTests('Automatic Beaming 4/4 with  3, 3, 2 Pattern and Overflow', this.beamingWithSeveralGroupsOverflow);
    runTests('Automatic Beaming 8/4 with  3, 2, 3 Pattern and 2 Overflows', this.beamingWithSeveralGroupsOverflow2);
    runTests('Automatic Beaming 8/4 with  3, 2, 3 Pattern and 3 Overflows', this.beamingWithSeveralGroupsOverflow3);
    runTests('Duration-Based Secondary Beam Breaks', this.secondaryBreaks);
    runTests('Duration-Based Secondary Beam Breaks 2', this.secondaryBreaks2);
    runTests('Flat Beams Up', this.flatBeamsUp);
    runTests('Flat Beams Down', this.flatBeamsDown);
    runTests('Flat Beams Mixed Direction', this.flatBeamsMixed);
    runTests('Flat Beams Up (uniform)', this.flatBeamsUpUniform);
    runTests('Flat Beams Down (uniform)', this.flatBeamsDownUniform);
    runTests('Flat Beams Up Bounds', this.flatBeamsUpBounds);
    runTests('Flat Beams Down Bounds', this.flatBeamsDownBounds);
  },

  simpleAuto(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(score.notes('f5/8, e5, d5, c5/16, c5, d5/8, e5, f5, f5/32, f5, f5, f5'), {
      time: '4/4',
    });

    // Takes a voice and returns it's auto beamsj
    const beams = Beam.applyAndGetBeams(voice);

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beaming Applicator Test');
  },

  simpleAutoWithOverflowGroup(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(score.notes('f5/4., e5/8, d5/8, d5/16, c5/16, c5/16, c5/16, f5/16, f5/32, f5/32'), {
      time: '4/4',
    });

    // Takes a voice and returns it's auto beamsj
    const beams = Beam.applyAndGetBeams(voice);

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beaming Applicator Test');
  },

  evenGroupStemDirections(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(score.notes('a4/8, b4, g4, c5, f4, d5, e4, e5, b4, b4, g4, d5'), { time: '6/4' });

    // Takes a voice and returns it's auto beams
    const beams = Beam.applyAndGetBeams(voice);

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    const UP = Stem.UP;
    const DOWN = Stem.DOWN;
    equal(beams[0].stem_direction, UP);
    equal(beams[1].stem_direction, UP);
    equal(beams[2].stem_direction, UP);
    equal(beams[3].stem_direction, UP);
    equal(beams[4].stem_direction, DOWN);
    equal(beams[5].stem_direction, DOWN);

    ok(true, 'Auto Beaming Applicator Test');
  },

  oddGroupStemDirections(options: TestOptions) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(score.notes('g4/8, b4, d5, c5, f4, d5, e4, g5, g4, b4, g4, d5, a4, c5, a4'), {
      time: '15/8',
    });

    const groups = [new Fraction(3, 8)];
    const beams = Beam.applyAndGetBeams(voice, null, groups);

    equal(beams[0].stem_direction, Stem.DOWN, 'Notes are equidistant from middle line');
    equal(beams[1].stem_direction, Stem.DOWN);
    equal(beams[2].stem_direction, Stem.UP);
    equal(beams[3].stem_direction, Stem.DOWN, 'Notes are equidistant from middle line');

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beaming Applicator Test');
  },

  oddBeamGroups(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(score.notes('f5, e5, d5, c5, c5, d5, e5, f5, f5, f4, f3, f5/16, f5'), { time: '6/4' });

    const groups = [new Fraction(2, 8), new Fraction(3, 8), new Fraction(1, 8)];

    // Takes a voice and returns it's auto beamsj
    const beams = Beam.applyAndGetBeams(voice, undefined, groups);

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  moreSimple0(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(score.notes('c4/8, g4, c5, g5, a5, c4, d4, a5'), { time: '4/4' });

    const beams = Beam.applyAndGetBeams(voice);

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  moreSimple1(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(
      score.notes('c5/16, g5, c5, c5/r, c5/r, (c4 e4 g4), d4, a5, c4, g4, c5, b4/r, (c4 e4), b4/r, b4/r, a4'),
      { time: '4/4' }
    );

    const beams = Beam.applyAndGetBeams(voice);

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  breakBeamsOnRests(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(
      score.notes('c5/16, g5, c5, c5/r, c5/r, (c4 e4 g4), d4, a5, c4, g4, c5, b4/r, (c4 e4), b4/r, b4/r, a4'),
      { time: '4/4' }
    );

    const beams = Beam.generateBeams(voice.getTickables(), {
      beam_rests: false,
    });

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  beamAcrossAllRestsWithStemlets(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(
      score.notes('c5/16, g5, c5, c5/r, c5/r, (c4 e4 g4), d4, a5, c4, g4, c5, b4/r, (c4 e4), b4/r, b4/r, a4'),
      { time: '4/4' }
    );

    const beams = Beam.generateBeams(voice.getTickables(), {
      beam_rests: true,
      show_stemlets: true,
    });

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  beamAcrossAllRests(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(
      score.notes('c5/16, g5, c5, c5/r, c5/r, (c4 e4 g4), d4, a5, c4, g4, c5, b4/r, (c4 e4), b4/r, b4/r, a4'),
      { time: '4/4' }
    );

    const beams = Beam.generateBeams(voice.getTickables(), {
      beam_rests: true,
    });

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  beamAcrossMiddleRests(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(
      score.notes('c5/16, g5, c5, c5/r, c5/r, (c4 e4 g4), d4, a5, c4, g4, c5, b4/r, (c4 e4), b4/r, b4/r, a4'),
      { time: '4/4' }
    );

    const beams = Beam.generateBeams(voice.getTickables(), {
      beam_rests: true,
      beam_middle_only: true,
    });

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  maintainStemDirections(options) {
    const f = VexFlowTests.makeFactory(options, 450, 200);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(
      score.notes(
        [
          'b4/16,            b4,              b4[stem="down"], b4/r',
          'b4/r,             b4[stem="down"], b4,              b4',
          'b4[stem="down"],  b4[stem="down"], b4,              b4/r',
          'b4/32,            b4[stem="down"], b4[stem="down"], b4, b4/16/r, b4',
        ].join(', '),
        { stem: 'up' }
      ),
      { time: '4/4' }
    );

    const beams = Beam.generateBeams(voice.getTickables(), {
      beam_rests: false,
      maintain_stem_directions: true,
    });

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  maintainStemDirectionsBeamAcrossRests(options) {
    const f = VexFlowTests.makeFactory(options, 450, 200);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(
      score.notes(
        [
          'b4/16,            b4,              b4[stem="down"], b4/r',
          'b4/r,             b4[stem="down"], b4,              b4',
          'b4[stem="down"],  b4[stem="down"], b4,              b4/r',
          'b4/32,            b4[stem="down"], b4[stem="down"], b4, b4/16/r, b4',
        ].join(', '),
        { stem: 'up' }
      ),
      { time: '4/4' }
    );

    const beams = Beam.generateBeams(voice.getTickables(), {
      beam_rests: true,
      maintain_stem_directions: true,
    });

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  groupWithUnbeamableNote(options) {
    const f = VexFlowTests.makeFactory(options, 450, 200);
    const stave = f.Stave().addTimeSignature('2/4');
    const score = f.EasyScore();

    const voice = score.voice(score.notes('b4/16, b4, b4/4, b4/16, b4'), { time: '2/4' });

    const beams = Beam.generateBeams(voice.getTickables(), {
      groups: [new Fraction(2, 2)],
      beam_rests: false,
      maintain_stem_directions: true,
    });

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  groupWithUnbeamableNote1(options) {
    const f = VexFlowTests.makeFactory(options, 450, 200);
    const stave = f.Stave().addTimeSignature('6/8');
    const score = f.EasyScore();

    const voice = score.voice(score.notes('b4/4, b4/4, b4/8, b4/8'), { time: '6/8' });

    const beams = Beam.generateBeams(voice.getTickables(), {
      groups: [new Fraction(3, 8)],
      beam_rests: false,
      maintain_stem_directions: true,
    });

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  autoOddBeamGroups(options) {
    const f = VexFlowTests.makeFactory(options, 450, 400);
    const score = f.EasyScore();

    const stave1 = f.Stave({ y: 10 }).addTimeSignature('5/4');
    const voice1 = score.voice(score.notes('c5/8, g5, c5, b4, b4, c4, d4, a5, c4, g4'), { time: '5/4' });

    const stave2 = f.Stave({ y: 150 }).addTimeSignature('5/8');
    const voice2 = score.voice(score.notes('c5/8, g5, c5, b4, b4'), { time: '5/8' });

    const stave3 = f.Stave({ y: 290 }).addTimeSignature('13/16');
    const voice3 = score.voice(score.notes('c5/16, g5, c5, b4, b4, c5, g5, c5, b4, b4, c5, b4, b4'), {
      time: '13/16',
    });

    const beams = [
      Beam.applyAndGetBeams(voice1, undefined, Beam.getDefaultBeamGroups('5/4')),
      Beam.applyAndGetBeams(voice2, undefined, Beam.getDefaultBeamGroups('5/8')),
      Beam.applyAndGetBeams(voice3, undefined, Beam.getDefaultBeamGroups('13/16')),
    ].reduce(concat);

    f.Formatter().formatToStave([voice1], stave1).formatToStave([voice2], stave2).formatToStave([voice3], stave3);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  customBeamGroups(options) {
    const f = VexFlowTests.makeFactory(options, 450, 400);
    const score = f.EasyScore();

    const stave1 = f.Stave({ y: 10 }).addTimeSignature('5/4');
    const voice1 = score.voice(score.notes('c5/8, g5, c5, b4, b4, c4, d4, a5, c4, g4'), { time: '5/4' });

    const stave2 = f.Stave({ y: 150 }).addTimeSignature('5/8');
    const voice2 = score.voice(score.notes('c5/8, g5, c5, b4, b4'), { time: '5/8' });

    const stave3 = f.Stave({ y: 290 }).addTimeSignature('13/16');
    const voice3 = score.voice(score.notes('c5/16, g5, c5, b4, b4, c5, g5, c5, b4, b4, c5, b4, b4'), {
      time: '13/16',
    });

    const group1 = [new Fraction(5, 8)];

    const group2 = [new Fraction(3, 8), new Fraction(2, 8)];

    const group3 = [new Fraction(7, 16), new Fraction(2, 16), new Fraction(4, 16)];

    const beams = [
      Beam.applyAndGetBeams(voice1, undefined, group1),
      Beam.applyAndGetBeams(voice2, undefined, group2),
      Beam.applyAndGetBeams(voice3, undefined, group3),
    ].reduce(concat);

    f.Formatter().formatToStave([voice1], stave1).formatToStave([voice2], stave2).formatToStave([voice3], stave3);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  simpleTuplets(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const notes = score.notes.bind(score);
    const tuplet = score.tuplet.bind(score);

    const voice = score.voice(
      [
        tuplet(notes('c4/8, g4, c5')),
        notes('g5/8, a5'),
        tuplet(notes('a5/16, (c5 e5), a5, d5, a5'), {
          ratioed: false,
          notes_occupied: 4,
        }),
      ].reduce(concat),
      { time: '3/4' }
    );

    const beams = Beam.applyAndGetBeams(voice);

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  moreSimpleTuplets(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const notes = score.notes.bind(score);
    const tuplet = score.tuplet.bind(score);

    const voice = score.voice([tuplet(notes('d4/4, g4, c5')), notes('g5/16, a5, a5, (c5 e5)')].reduce(concat), {
      time: '3/4',
    });

    const beams = Beam.applyAndGetBeams(voice);

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  moreBeaming(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(score.notes('c4/8, g4/4, c5/8., g5/16, a5/4, a5/16, (c5 e5)/16, a5/8'), {
      time: '9/8',
    });

    const beams = Beam.applyAndGetBeams(voice, undefined, Beam.getDefaultBeamGroups('9/8'));

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  beamingWithSeveralGroups1(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(score.notes('c4/8, g4/4, c5/8, g5, a5, a5, f5'), { time: '4/4' });

    const beams = Beam.applyAndGetBeams(voice, undefined, [new Fraction(3, 8), new Fraction(3, 8), new Fraction(2, 8)]);

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  beamingWithSeveralGroupsOverflow(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(score.notes('c4/8, g4/4., c5/8, g5, a5, a5'), { time: '4/4' });

    const beams = Beam.applyAndGetBeams(voice, undefined, [new Fraction(3, 8), new Fraction(3, 8), new Fraction(2, 8)]);

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  beamingWithSeveralGroupsOverflow2(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(
      score.notes('c4/16, g4/2, f4/16, c5/8, a4/16, c4/16, g4/8, b4, c5, g5, f5, e5, c5, a4/4'),
      { time: '8/4' }
    );

    const beams = Beam.applyAndGetBeams(voice, undefined, [new Fraction(3, 8), new Fraction(2, 8), new Fraction(3, 8)]);

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  beamingWithSeveralGroupsOverflow3(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(score.notes('c4/16, g4/1, f4/16, c5/8, g5, f5, e5, c5, a4/4'), { time: '8/4' });

    const beams = Beam.applyAndGetBeams(voice, undefined, [new Fraction(3, 8), new Fraction(2, 8), new Fraction(3, 8)]);

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Auto Beam Applicator Test');
  },

  secondaryBreaks(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const voice = score.voice(
      score.notes(
        [
          'f5/32, f5, f5, f5, f5/16., f5/32',
          'f5/16, f5/8, f5/16',
          'f5/32, f5/16., f5., f5/32',
          'f5/16., f5/32, f5, f5/16.',
        ].join(',')
      )
    );

    const beams = Beam.generateBeams(voice.getTickables(), {
      secondary_breaks: '8',
    });

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Duration-Based Secondary Breaks Test');
  },

  secondaryBreaks2(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave();
    const score = f.EasyScore();

    const notes = score.notes.bind(score);
    const tuplet = score.tuplet.bind(score);

    const voice = score.voice(
      [
        tuplet(notes('e5/16, f5, f5')),
        tuplet(notes('f5/16, f5, c5')),
        notes('a4/16., f4/32'),
        tuplet(notes('d4/16, d4, d4')),
        tuplet(notes('a5/8, (e5 g5), a5')),
        tuplet(notes('f5/16, f5, f5')),
        tuplet(notes('f5/16, f5, a4')),
      ].reduce(concat)
    );

    const beams = Beam.generateBeams(voice.getTickables(), {
      secondary_breaks: '8',
    });

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Duration-Based Secondary Breaks Test');
  },

  flatBeamsUp(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave({ y: 40 });
    const score = f.EasyScore();

    const tuplet = score.tuplet.bind(score);
    const notes = score.notes.bind(score);

    const voice = score.voice(
      [
        tuplet(notes('c4/8, g4, f5')),
        notes('d5/8'),
        tuplet(notes('c5/16, (c4 e4 g4), f4')),
        notes('d5/8, e5, c4, f5/32, f5, f5, f5'),
      ].reduce(concat)
    );

    const beams = Beam.generateBeams(voice.getTickables(), {
      flat_beams: true,
      stem_direction: 1,
    });

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Flat Beams Up Test');
  },

  flatBeamsDown(options) {
    const f = VexFlowTests.makeFactory(options, 450, 200);
    const stave = f.Stave({ y: 40 });
    const score = f.EasyScore();

    const voice = score.voice(
      score.notes(
        'c5/64, c5, c5, c5, c5, c5, c5, c5, a5/8, g5, (d4 f4 a4)/16, d4, d5/8, e5, g5, a6/32, a6, a6, g4/64, g4'
      )
    );

    const beams = Beam.generateBeams(voice.getTickables(), {
      flat_beams: true,
      stem_direction: -1,
    });

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Flat Beams Down Test');
  },

  flatBeamsMixed(options) {
    const f = VexFlowTests.makeFactory(options, 450, 200);
    const stave = f.Stave({ y: 40 });
    const score = f.EasyScore();

    const voice = score.voice(
      score.notes(
        'c5/64, d5, e5, c5, f5, c5, a5, c5, a5/8, g5, (d4 f4 a4)/16, d4, d5/8, e5, c4, a4/32, a4, a4, g4/64, g4'
      )
    );

    const beams = Beam.generateBeams(voice.getTickables(), {
      flat_beams: true,
    });

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Flat Beams Mixed Direction Test');
  },

  flatBeamsUpUniform(options) {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave({ y: 40 });
    const score = f.EasyScore();

    const tuplet = score.tuplet.bind(score);
    const notes = score.notes.bind(score);

    const voice = score.voice(
      [tuplet(notes('c4/8, g4, g5')), notes('d5/8, c5/16, (c4 e4 g4), d5/8, e5, c4, f5/32, f5, f5, f5')].reduce(concat)
    );

    const beams = Beam.generateBeams(voice.getTickables(), {
      flat_beams: true,
      flat_beam_offset: 50,
      stem_direction: 1,
    });

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Flat Beams Up (uniform) Test');
  },

  flatBeamsDownUniform(options) {
    const f = VexFlowTests.makeFactory(options, 450, 200);
    const stave = f.Stave({ y: 40 });
    const score = f.EasyScore();

    const voice = score.voice(
      score.notes(
        'c5/64, c5, c5, c5, c5, c5, c5, c5, a5/8, g5, (e4 g4 b4)/16, e5, d5/8, e5/8, g5/8, a6/32, a6, a6, g4/64, g4'
      )
    );

    const beams = Beam.generateBeams(voice.getTickables(), {
      flat_beams: true,
      flat_beam_offset: 155,
      stem_direction: -1,
    });

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Flat Beams Down (uniform) Test');
  },

  flatBeamsUpBounds(options: TestOptions): void {
    const f = VexFlowTests.makeFactory(options);
    const stave = f.Stave({ y: 40 });
    const score = f.EasyScore();

    const tuplet = score.tuplet.bind(score);
    const notes = score.notes.bind(score);
    const voice = score.voice(
      [
        tuplet(notes('c4/8, g4/8, g5/8')),
        notes('d5/8, c5/16, (c4 e4 g4)/16, d5/8, e5/8, c4/8, f5/32, f5/32, f5/32, f5/32'),
      ].reduce(concat)
    );

    const beams = Beam.generateBeams(voice.getTickables(), {
      flat_beams: true,
      flat_beam_offset: 60,
      stem_direction: 1,
    });

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Flat Beams Up (uniform) Test');
  },

  flatBeamsDownBounds(options: TestOptions): void {
    const f = VexFlowTests.makeFactory(options, 450, 200);
    const stave = f.Stave({ y: 40 });
    const score = f.EasyScore();

    const voice = score.voice(
      score.notes(
        [
          'g5/8, a6/32, a6/32, a6/32, g4/64, g4/64',
          'c5/64, c5/64, c5/64, c5/64, c5/64, c5/64, c5/64, c5/64, a5/8',
          'g5/8, (e4 g4 b4)/16, e5/16',
          'd5/8, e5/8',
        ].join(','),
        { stem: 'down' }
      )
    );

    const beams = Beam.generateBeams(voice.getTickables(), {
      flat_beams: true,
      flat_beam_offset: 145,
      stem_direction: -1,
    });

    f.Formatter().joinVoices([voice]).formatToStave([voice], stave);

    f.draw();

    beams.forEach(function (beam) {
      return beam.setContext(f.getContext()).draw();
    });

    ok(true, 'Flat Beams Down (uniform) Test');
  },
};

export { AutoBeamFormattingTests };
