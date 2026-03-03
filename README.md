# Solar System simulator with physics engine

Disclaimer: HEAVILY AI assisted project. I am unfamiliar with rust or most of the complex physics required to achieve these results. This is not an accurate represantation of my knowledge or skills. Its mostly a mess & so is the commit history, but the results are pretty accurate, so I decided to upload it, as it's a really fun tool to mess around with.

This is a solar system simulator with a physics engine. The interface allows you to toggle specific physics features ON/OFF and you can track celestial bodies in real time or speed up the simulation. The interface also allows you to edit the properties of specific celestial bodies and observe the effects this may have on the rest of the solar system.
The integrators implemented have some performance/quality trade-offs, as described in the UI. I have defaulted to one that is a good balance. The physics engine mostly struggles with moons that have really short orbital periods around their parent planet, as showcased in the report below.

To run project:

1. `npm install` - Install dependencies
2. `npm run pull-data` - Pull data from JPL Horizons
3. `npm run export-bodies` - Export formatted data to RUST physics engine
4. `npm run dev` - Run project

Tests:

1. `npm run unit-test` - Unit tests for physics engine
2. `npm run test:integration` - Integration tests for physics engine

# Results

Running the integration tests generetates a report that compares 30days of simulation time against data from JPL Horizons and calculates the margin of error.

Example report:

# DOP853 Physics Engine Validation Report

**Date:** 2026-03-03 13:49:00
**Run ID:** 2026-03-03T13-48-42

**Duration:** 720 hours (30 days)

**Test Type:** Full Physics Engine (via `Simulation` module)

| Body      | Max Pos Error % | Max Pos Error (km) | Final Pos Error (km) | Week 1 (km) | Week 2 (km) | Week 3 (km) | Week 4 (km) | Max Vel Error % | Max Vel Error (m/s) |
| --------- | --------------- | ------------------ | -------------------- | ----------- | ----------- | ----------- | ----------- | --------------- | ------------------- |
| Deimos    | 0.000187%       | 386.068            | 386.068              | 93.573      | 175.375     | 274.924     | 354.690     | 0.086157%       | 22.228598           |
| Phobos    | 0.000175%       | 362.083            | 355.236              | 84.470      | 169.209     | 254.000     | 338.822     | 0.327600%       | 83.713184           |
| Miranda   | 0.000012%       | 343.585            | 343.585              | 76.966      | 150.340     | 225.451     | 301.431     | 1.328182%       | 17.174451           |
| Ariel     | 0.000004%       | 128.308            | 110.532              | 26.552      | 57.336      | 93.958      | 118.162     | 0.177414%       | 3.522935            |
| Mimas     | 0.000004%       | 62.082             | 60.924               | 14.409      | 28.662      | 44.120      | 56.944      | 0.067240%       | 4.886904            |
| Charon    | 0.000004%       | 193.527            | 167.122              | 16.450      | 54.600      | 110.904     | 175.052     | 0.016961%       | 0.861035            |
| Tethys    | 0.000003%       | 48.107             | 48.107               | 11.623      | 22.018      | 33.042      | 45.054      | 0.037326%       | 1.845716            |
| Enceladus | 0.000003%       | 46.638             | 46.638               | 10.597      | 21.243      | 32.003      | 42.920      | 0.041785%       | 2.482663            |
| Umbriel   | 0.000003%       | 81.453             | 67.184               | 21.594      | 25.061      | 55.773      | 76.656      | 0.043469%       | 1.253279            |
| Dione     | 0.000003%       | 36.465             | 36.465               | 8.723       | 16.679      | 25.981      | 33.628      | 0.021231%       | 0.968965            |
| Pluto     | 0.000002%       | 125.060            | 125.060              | 28.056      | 54.741      | 80.168      | 105.413     | 0.003163%       | 0.166643            |
| Rhea      | 0.000002%       | 30.097             | 30.097               | 7.147       | 13.484      | 21.265      | 27.077      | 0.010573%       | 0.482254            |
| Titania   | 0.000002%       | 58.737             | 35.586               | 6.687       | 10.346      | 48.894      | 57.455      | 0.007540%       | 0.430433            |
| Europa    | 0.000002%       | 13.966             | 13.966               | 3.364       | 6.727       | 10.087      | 13.441      | 0.022307%       | 0.283315            |
| Triton    | 0.000002%       | 68.560             | 64.056               | 12.364      | 25.128      | 44.197      | 65.558      | 0.022676%       | 0.765758            |
| Titan     | 0.000001%       | 20.616             | 20.616               | 4.326       | 10.049      | 12.493      | 19.616      | 0.001570%       | 0.090507            |
| Ganymede  | 0.000001%       | 11.289             | 11.289               | 2.791       | 5.580       | 8.366       | 11.146      | 0.004319%       | 0.116412            |
| Callisto  | 0.000001%       | 9.353              | 9.353                | 1.820       | 4.677       | 5.300       | 8.754       | 0.000441%       | 0.038910            |
| Io        | 0.000001%       | 8.886              | 8.886                | 2.092       | 4.174       | 6.245       | 8.307       | 0.007962%       | 0.366314            |
| Oberon    | 0.000001%       | 21.101             | 21.101               | 5.213       | 9.510       | 11.260      | 10.922      | 0.001644%       | 0.091321            |
| Iapetus   | 0.000001%       | 9.296              | 9.296                | 0.416       | 1.788       | 4.322       | 8.047       | 0.000139%       | 0.009664            |
| Uranus    | 0.000001%       | 15.474             | 15.474               | 3.668       | 7.910       | 11.329      | 14.737      | 0.000205%       | 0.013721            |
| Moon      | 0.000000%       | 0.405              | 0.394                | 0.046       | 0.205       | 0.372       | 0.401       | 0.000003%       | 0.001030            |
| Neptune   | 0.000000%       | 7.948              | 7.948                | 1.800       | 3.692       | 5.583       | 7.381       | 0.000121%       | 0.006596            |
| Mercury   | 0.000000%       | 0.110              | 0.110                | 0.006       | 0.023       | 0.053       | 0.095       | 0.000000%       | 0.000099            |
| Sun       | 0.000000%       | 0.000              | 0.000                | 0.000       | 0.000       | 0.000       | 0.000       | 0.000002%       | 0.000000            |
| Venus     | 0.000000%       | 0.027              | 0.027                | 0.001       | 0.005       | 0.013       | 0.023       | 0.000000%       | 0.000022            |
| Earth     | 0.000000%       | 0.016              | 0.016                | 0.002       | 0.006       | 0.005       | 0.012       | 0.000000%       | 0.000024            |
| Saturn    | 0.000000%       | 0.117              | 0.117                | 0.027       | 0.073       | 0.084       | 0.098       | 0.000001%       | 0.000118            |
| Jupiter   | 0.000000%       | 0.064              | 0.064                | 0.015       | 0.030       | 0.045       | 0.059       | 0.000001%       | 0.000160            |
| Mars      | 0.000000%       | 0.007              | 0.007                | 0.000       | 0.001       | 0.003       | 0.006       | 0.000000%       | 0.000006            |
| Vesta     | 0.000000%       | 0.002              | 0.002                | 0.000       | 0.000       | 0.001       | 0.002       | 0.000000%       | 0.000001            |
| Hygiea    | 0.000000%       | 0.002              | 0.002                | 0.000       | 0.000       | 0.001       | 0.002       | 0.000000%       | 0.000002            |
| Pallas    | 0.000000%       | 0.001              | 0.001                | 0.000       | 0.000       | 0.000       | 0.001       | 0.000000%       | 0.000001            |
| Ceres     | 0.000000%       | 0.000              | 0.000                | 0.000       | 0.000       | 0.000       | 0.000       | 0.000000%       | 0.000000            |
| Makemake  | 0.000000%       | 0.000              | 0.000                | 0.000       | 0.000       | 0.000       | 0.000       | 0.000000%       | 0.000000            |
| Haumea    | 0.000000%       | 0.000              | 0.000                | 0.000       | 0.000       | 0.000       | 0.000       | 0.000000%       | 0.000000            |
| 1P/Halley | 0.000000%       | 0.000              | 0.000                | 0.000       | 0.000       | 0.000       | 0.000       | 0.000000%       | 0.000000            |
| Sedna     | 0.000000%       | 0.000              | 0.000                | 0.000       | 0.000       | 0.000       | 0.000       | 0.000000%       | 0.000000            |
| Eris      | 0.000000%       | 0.000              | 0.000                | 0.000       | 0.000       | 0.000       | 0.000       | 0.000000%       | 0.000000            |
| Quaoar    | 0.000000%       | 0.000              | 0.000                | 0.000       | 0.000       | 0.000       | 0.000       | 0.000000%       | 0.000000            |
