from app.code_run_reconciler import retry_delay


def test_code_run_reconcile_backoff_is_exponential_and_bounded():
    assert retry_delay(1) == 2
    assert retry_delay(2) == 4
    assert retry_delay(3) == 8
    assert retry_delay(8) == 256
    assert retry_delay(9) == 256
    assert retry_delay(100) == 256
