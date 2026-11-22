import os
import tempfile
import unittest
from datetime import datetime, timezone

TEMP = tempfile.TemporaryDirectory()
os.environ["ALLEGRO_RADIO_DATA_DIR"] = TEMP.name

import engine


def eligible_item(item_id="radio-item-001"):
    return {
        "item_id": item_id,
        "artist_id": "artist-001",
        "track_id": "track-001",
        "title": "Approved Track",
        "artist_name": "Signed Artist",
        "agreement_ref": "artist-agreement:001",
        "agreement_status": "active",
        "broadcast_clearance_ref": "track-clearance:001",
        "broadcast_clearance_status": "cleared",
        "publication_status": "published",
        "audio_asset_ref": "asset:sha256:abc123",
        "audio_asset_status": "verified",
        "evidence_issuer": "allegro-authoritative-rights-service",
        "evidence_verified_at": datetime.now(timezone.utc).isoformat(),
    }


class RadioEngineTests(unittest.TestCase):
    def setUp(self):
        for suffix in ("", "-wal", "-shm"):
            path = str(engine.DB_PATH) + suffix
            if os.path.exists(path):
                os.remove(path)

    def test_valid_item_is_eligible(self):
        self.assertEqual(engine.validate_item(eligible_item()), [])

    def test_unsigned_artist_is_blocked(self):
        item = eligible_item()
        item["agreement_status"] = "inactive"
        self.assertTrue(any("agreement" in e for e in engine.validate_item(item)))

    def test_missing_track_clearance_is_blocked(self):
        item = eligible_item()
        item["broadcast_clearance_status"] = "pending"
        self.assertTrue(any("clearance" in e for e in engine.validate_item(item)))

    def test_unpublished_track_is_blocked(self):
        item = eligible_item()
        item["publication_status"] = "draft"
        self.assertTrue(any("published" in e for e in engine.validate_item(item)))

    def test_missing_real_audio_is_blocked(self):
        item = eligible_item()
        item["audio_asset_status"] = "missing"
        self.assertTrue(any("audio asset" in e for e in engine.validate_item(item)))

    def test_evidence_requires_timezone(self):
        item = eligible_item()
        item["evidence_verified_at"] = "2026-11-22T10:00:00"
        self.assertTrue(any("timezone" in e for e in engine.validate_item(item)))

    def test_queue_is_persistent_and_exact_retry_is_idempotent(self):
        item = eligible_item()
        first, created = engine.enqueue(item)
        second, created_again = engine.enqueue(item)
        self.assertTrue(created)
        self.assertFalse(created_again)
        self.assertEqual(first["item_id"], second["item_id"])
        self.assertEqual(engine.get_item(item["item_id"])["state"], "scheduled")

    def test_changed_payload_cannot_reuse_item_id(self):
        item = eligible_item()
        engine.enqueue(item)
        changed = dict(item, title="Different payload")
        with self.assertRaises(FileExistsError):
            engine.enqueue(changed)

    def test_state_machine_requires_order(self):
        item = eligible_item()
        engine.enqueue(item)
        with self.assertRaises(ValueError):
            engine.transition(item["item_id"], "playing")
        self.assertEqual(engine.transition(item["item_id"], "ready")["state"], "ready")
        self.assertEqual(engine.transition(item["item_id"], "playing")["state"], "playing")
        self.assertEqual(engine.transition(item["item_id"], "completed")["state"], "completed")

    def test_terminal_state_cannot_be_reopened(self):
        item = eligible_item()
        engine.enqueue(item)
        engine.transition(item["item_id"], "blocked")
        with self.assertRaises(ValueError):
            engine.transition(item["item_id"], "ready")


if __name__ == "__main__":
    unittest.main()
