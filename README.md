# MENTAT - backdated impressions and events

Mentat is a script designed to create a series of impressions and events, assign them random values, and timestamp them to have begun a week in the past.

By "backdating" the impressions and events, a Split user can generate charts now, while still making it appear as if the data was collected over time.

In order for the approach to work currently...

 - You must enter the version number of your target split.  The split must define a 50/50 default rule.  For best results, the version of the split should be at least three days old.   

 - You must enter your server-sider SDK API key

The split name and SDK key are cached in a config.json for convenience doing repeat runs.

 - Enter the desired impact.  This is very approximate.

 - Enter the desired event type id

This will be the name of the event that shows up with a run.  You will need to create a metric, and maybe relax the experiment settings (I use 0.2 and sample size of 10).

For extra credit, setup dimensional analysis:

 - "platform" is the dimension name
 - "chrome", "edge", "firefox", "android", and "ios" are values, all lower case.

Author: david.martin@split.io
