import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import engine


VALID_RELEASE = {
    "release_id": "release-001-v1",
    "version": "1",
    "title": "Test Release",
    "primary_artist_id": "artist-001",
    "audio_asset_ref": "asset://audio/test-release",
    "artwork_asset_ref": "asset://artwork/test-release",
    "metadata_complete": True,
    "territory_rights_confirmed": True,
    "contributor_splits_confirmed": True,
}


class ReleaseValidationTests(unittest.TestCase):
    def test_complete_release_is_eligible(self):
        self.assertEqual(engine.validate_release(VALID_RELEASE), {"eligible": True, "blockers": []})

    def test_missing_rights_confirmation_blocks_release(self):
        payload = dict(VALID_RELEASE, territory_rights_confirmed=False)
        result = engine.validate_release(payload)
        self.assertFalse(result["eligible"])
        self.assertIn("territory_rights_confirmed_not_confirmed", result["blockers"])

    def test_non_object_is_rejected(self):
        self.assertEqual(
            engine.validate_release([]),
            {"eligible": False, "blockers": ["request_body_must_be_object"]},
        )


class ReleasePersistenceTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tempdir.name) / "engine.sqlite3"
        self.patcher = patch.multiple(engine, DATA_DIR=Path(self.tempdir.name), DB_PATH=self.db_path)
        self.patcher.start()
        engine.initialise_db()

    def tearDown(self):
        self.patcher.stop()
        self.tempdir.cleanup()

    def test_store_and_read_release(self):
        result, status = engine.store_release(VALID_RELEASE)
        self.assertEqual(status, 201)
        self.assertEqual(result["status"], "recorded")
        stored = engine.read_release("release-001-v1")
        self.assertEqual(stored["payload"], VALID_RELEASE)

    def test_exact_retry_is_idempotent(self):
        engine.store_release(VALID_RELEASE)
        result, status = engine.store_release(VALID_RELEASE)
        self.assertEqual(status, 200)
        self.assertEqual(result["status"], "already_recorded")

    def test_changed_payload_cannot_overwrite_release_id(self):
        engine.store_release(VALID_RELEASE)
        changed = dict(VALID_RELEASE, title="Changed title")
        result, status = engine.store_release(changed)
        self.assertEqual(status, 409)
        self.assertEqual(result["error"], "release_id_conflict")

    def test_unready_release_is_not_persisted(self):
        invalid = dict(VALID_RELEASE, contributor_splits_confirmed=False)
        result, status = engine.store_release(invalid)
        self.assertEqual(status, 422)
        self.assertIsNone(engine.read_release("release-001-v1"))


if __name__ == "__main__":
    unittest.main()
