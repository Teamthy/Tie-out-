from tieout.selftest import selftest


def test_selftest_8_of_8():
    passed, total, results = selftest()
    assert total == 8
    assert passed == 8, [
        f"{name}: {detail}" for name, ok, detail in results if not ok
    ]
