import { useCallback, useEffect, useState } from 'react';
import api from '../../../services/api';

// Parallel data fetcher for the TestProfile page. The legacy
// pages/TestProfile.jsx fired 5 serial awaits on mount which added
// 300-800ms to first paint. We now fan these out with Promise.allSettled
// so a single slow endpoint doesn't delay unrelated sections, and a
// failure in one doesn't cascade (e.g. leaderboard 500 still lets the
// main card render).
//
// The hook returns a state bag:
//   {
//     test, leaderboard, attemptInfo, myRating, myDifficulty,
//     distribution, related, myHistory,
//     loading, error, deadlineError, refetchMyRatings
//   }
//
// `error` is reserved for "test doesn't exist / network failed" —
// `deadlineError` is the specific 403 shape returned when the test is
// outside its publication window and wants an in-place friendly card.

export function useTestProfileData(shareLink, currentUser) {
  const [test, setTest] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [attemptInfo, setAttemptInfo] = useState({ attempts: 0, maxAttempts: 0 });
  const [myRating, setMyRating] = useState(0);
  const [myDifficulty, setMyDifficulty] = useState(0);
  const [distribution, setDistribution] = useState(null);
  const [related, setRelated] = useState({ items: [] });
  const [myHistory, setMyHistory] = useState({ attempts: [], count: 0, best: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deadlineError, setDeadlineError] = useState(null);

  const currentUserId = currentUser?._id || currentUser?.id || null;

  // Only the test fetch is a hard prereq — downstream fetches need its
  // _id. Everything else is fan-out after.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDeadlineError(null);

    try {
      const res = await api.get(`/tests/share/${shareLink}`);
      const testDoc = res.data;
      setTest(testDoc);

      // Fan-out: 7 independent fetches. Promise.allSettled so one
      // failure (e.g. 404 on related when no other tests exist) does
      // not block the page from rendering.
      const [
        lbRes,
        attRes,
        myRatingRes,
        myDiffRes,
        distRes,
        relRes,
        histRes,
      ] = await Promise.allSettled([
        api.get(`/results/leaderboard/${testDoc._id}`),
        currentUserId ? api.get(`/results/my-attempts/${testDoc._id}`) : Promise.resolve({ data: null }),
        currentUserId ? api.get(`/tests/${testDoc._id}/my-rating`) : Promise.resolve({ data: null }),
        currentUserId ? api.get(`/tests/${testDoc._id}/my-difficulty-rating`) : Promise.resolve({ data: null }),
        api.get(`/results/distribution/${testDoc._id}`),
        api.get(`/tests/${testDoc._id}/related?limit=4`),
        currentUserId ? api.get(`/results/my-attempts-list/${testDoc._id}`) : Promise.resolve({ data: null }),
      ]);

      if (lbRes.status === 'fulfilled' && lbRes.value?.data) {
        setLeaderboard(lbRes.value.data);
      }
      if (attRes.status === 'fulfilled' && attRes.value?.data) {
        setAttemptInfo({
          attempts: attRes.value.data.attempts || 0,
          maxAttempts: testDoc.settings?.maxAttempts || 0,
        });
      }
      if (myRatingRes.status === 'fulfilled' && myRatingRes.value?.data) {
        setMyRating(myRatingRes.value.data.rating || 0);
      }
      if (myDiffRes.status === 'fulfilled' && myDiffRes.value?.data) {
        setMyDifficulty(myDiffRes.value.data.difficulty || 0);
      }
      if (distRes.status === 'fulfilled' && distRes.value?.data) {
        setDistribution(distRes.value.data);
      }
      if (relRes.status === 'fulfilled' && relRes.value?.data) {
        setRelated(relRes.value.data);
      }
      if (histRes.status === 'fulfilled' && histRes.value?.data) {
        setMyHistory(histRes.value.data);
      }
    } catch (err) {
      // Distinguish "doesn't exist / server error" from "window closed".
      if (err.response?.status === 403 && err.response?.data?.code) {
        setDeadlineError(err.response.data);
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [shareLink, currentUserId]);

  useEffect(() => {
    if (!shareLink) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareLink, currentUserId]);

  // Mutation callbacks — rate + rateDifficulty update local state
  // optimistically and bubble up new aggregate numbers from server.
  const rate = useCallback(async (value) => {
    if (!test?._id) return;
    const res = await api.post(`/tests/${test._id}/rate`, { rating: value });
    setMyRating(value);
    setTest(prev => prev ? { ...prev, rating: res.data.rating, ratingCount: res.data.ratingCount } : prev);
    return res.data;
  }, [test?._id]);

  const rateDifficulty = useCallback(async (value) => {
    if (!test?._id) return;
    const res = await api.post(`/tests/${test._id}/rate-difficulty`, { difficulty: value });
    setMyDifficulty(value);
    setTest(prev => prev ? {
      ...prev,
      difficultyScore: res.data.difficultyScore,
      difficultyCount: res.data.difficultyCount,
    } : prev);
    return res.data;
  }, [test?._id]);

  return {
    test,
    leaderboard,
    attemptInfo,
    myRating,
    myDifficulty,
    distribution,
    related,
    myHistory,
    loading,
    error,
    deadlineError,
    rate,
    rateDifficulty,
    reload: load,
  };
}
