import { fmt, fmtDate } from "./ui.jsx";

/* Every message a student can see on the home screen, driven by state.
   The 3 most important: BOOKED, PASSED, RETAKE_LATER. */
export function studentMessage(s) {
  const first = (s.student_name || "there").split(" ")[0];
  const t = s.track_name;
  const i = s.interview || {};
  switch (s.state) {
    case "NOT_ELIGIBLE":
      return { tone: "slate", title: `Keep going, ${first}`, body: `Clear every skill needed for the ${t} Badge to unlock your interview. We'll tell you the moment you're eligible.` };
    case "ELIGIBLE":
      return {
        tone: "blue",
        title: `You're ready for your interview, ${first}!`,
        body: `You've cleared every skill for the ${t} Badge. Pick a slot that suits you; it takes about 30 minutes.` +
          (s.last_cancelled_by === "interviewer" ? " Your earlier slot was cancelled by the interviewer. Sorry about that, please pick a new time." : ""),
      };
    case "BOOKED":
      return {
        tone: "amber",
        title: `You're booked, ${first}!`,
        body: `Your ${t} interview is on ${fmt(i.start_time)} with ${i.interviewer_name}. Your meeting link will appear here 15 minutes before. Need to change plans? You can cancel up to 2 hours before.`,
      };
    case "PASSED":
      return {
        tone: "green",
        title: `Congratulations, ${first}! You've earned your ${t} Badge.`,
        body: `You cleared the interview with ${i.interviewer_name}. Your badge is now live on your profile.`,
      };
    case "RETAKE_LATER":
      return {
        tone: "orange",
        title: `Not yet, ${first}. You're close.`,
        body: `${i.interviewer_name} would like to see a little more before awarding your badge. Their feedback: "${i.notes}" You can book your next attempt from ${fmtDate(s.retake_after)}.`,
      };
    case "FAILED":
      return {
        tone: "red",
        title: `This attempt didn't go your way, ${first}`,
        body: `Feedback from ${i.interviewer_name}: "${i.notes}" Use the next two weeks to work on it. You can book again from ${fmtDate(s.retake_after)}.`,
      };
    case "NO_SHOW":
      return { tone: "red", title: `We missed you, ${first}`, body: `You didn't join your interview on ${fmt(i.start_time)}. You can book a new slot from ${fmtDate(s.retake_after)}.` };
    case "BADGE_NULLIFIED":
      return { tone: "rose", title: `Your ${t} Badge has been removed`, body: `After review, this badge was nullified because of a malpractice flag${s.reason ? ` (${s.reason})` : ""}. Please contact the GRIT team if you think this is a mistake.` };
    default:
      return { tone: "slate", title: "Hello", body: "" };
  }
}
