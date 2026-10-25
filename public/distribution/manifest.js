/* ALLEGRO-VIBEZ Distribution Manifest Engine v1
 * Metadata-only: generates a deterministic delivery manifest from supplied release data.
 * No provider submission is performed here.
 */
(function () {
  'use strict';

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function normaliseRelease(release, tracks, credits) {
    const safeTracks = Array.isArray(tracks) ? tracks : [];
    const safeCredits = Array.isArray(credits) ? credits : [];
    return {
      manifest_version: '1.0',
      generated_at: new Date().toISOString(),
      release: {
        id: clean(release && release.id),
        title: clean(release && release.title),
        release_type: clean(release && release.release_type),
        release_date: clean(release && release.release_date),
        artwork_url: clean(release && release.artwork_url),
        copyright_year: release && release.copyright_year || null,
        label_name: clean(release && release.label_name),
        upc: clean(release && release.upc)
      },
      tracks: safeTracks.map(function (track, index) {
        return {
          id: clean(track.id),
          track_number: track.track_number || index + 1,
          title: clean(track.title),
          version: clean(track.version),
          isrc: clean(track.isrc),
          duration_seconds: track.duration_seconds || null,
          explicit: Boolean(track.explicit),
          audio_url: clean(track.audio_url)
        };
      }),
      release_credits: safeCredits.map(function (credit) {
        return {
          name: clean(credit.name),
          role: clean(credit.role),
          percentage: credit.percentage == null ? null : Number(credit.percentage),
          ipi: clean(credit.ipi),
          pro_name: clean(credit.pro_name),
          notes: clean(credit.notes)
        };
      })
    };
  }

  function validate(manifest) {
    const errors = [];
    const release = manifest.release;
    if (!release.title) errors.push('Release title is required.');
    if (!release.release_date) errors.push('Release date is required.');
    if (!release.artwork_url) errors.push('Artwork URL is required.');
    if (!release.upc) errors.push('UPC/catalogue identifier is required.');
    if (!manifest.tracks.length) errors.push('At least one track is required.');
    manifest.tracks.forEach(function (track, index) {
      const label = 'Track ' + (index + 1);
      if (!track.title) errors.push(label + ': title is required.');
      if (!track.isrc) errors.push(label + ': ISRC is required.');
      if (!track.audio_url) errors.push(label + ': audio asset reference is required.');
    });
    if (!manifest.release_credits.length) errors.push('At least one release credit is required.');
    return { ready: errors.length === 0, errors: errors };
  }

  window.ALLEGRODistributionManifest = {
    build: normaliseRelease,
    validate: validate
  };
})();
