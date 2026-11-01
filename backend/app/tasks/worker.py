import time
import sys
import os
import logging

# Ensure backend root is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import SessionLocal
from app.models.verification_job import VerificationJob
from app.services.job_queue import run_job_sync, recover_pending_jobs

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("aicte_smartapproval.worker")

def run_worker_loop():
    logger.info("==================================================================")
    logger.info("AICTE SmartApproval Automated Verification Worker Daemon Started")
    logger.info("==================================================================")
    logger.info("Scanning for pending and interrupted verification jobs...")
    
    # Initial recovery
    recover_pending_jobs()

    while True:
        try:
            db = SessionLocal()
            pending_job = db.query(VerificationJob).filter(VerificationJob.status == "PENDING").first()
            if pending_job:
                logger.info(f"Picked up job {pending_job.job_id} for Application #{pending_job.application_id}")
                run_job_sync(pending_job.job_id)
            db.close()
        except Exception as e:
            logger.error(f"Worker loop exception: {e}")
        
        time.sleep(2)

if __name__ == "__main__":
    run_worker_loop()
