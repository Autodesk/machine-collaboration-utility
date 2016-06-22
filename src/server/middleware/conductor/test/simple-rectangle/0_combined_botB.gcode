; ============================================================
; botB.0000.gcode
; e5f30533-5a33-41e3-b708-ab91b3b424ab
; start_code
G90; set to absolute coordinates
M82; set extruder to absolute
G21; set units to millimeters
G92 E0; reset extrusion length
M106 S0; turn off fan
M140 S0; set bed temp
M104 S220 T0; begin nozzle temperature change; set nozzle temp
G4 S2; wait for adjacent bot
G28 X0.000; home X
G1 X1.000 F5400; move away
G28 X0.000; home X again
; ============================================================
; botB.0001.gcode
; e0787fcf-47c2-4d89-aaa9-287aa1a2285d
M190 S0; set bed temp
M109 S220 T0; wait for nozzle to reach temperature; set nozzle temp
G28 Y0.000; home Y
G1 Y25.000; move to Y min
G28 Z0.000; home Z
G1 Z1.000 F1080; move away from build plate
; printCeilingSlam
G1 Z30.000
G1 Y1.000 F5400
G1 Z280.000 F1080
G92 Z0
G1 X0.000 Y1.000 Z30.000
G1 Z29.000
G1 Z40.000
G92 Z280
G1 X0.000 Y1.000 Z30.000
G1 Y25.000 F5400
G1 F1080
G28 Z0.000; home Z
G1 Z1.000; move away from build plate
; ============================================================
; botB.0002.gcode
; 3dd11571-3337-480b-b5d6-7e09cc3ced87
G1 X230.879 Y30.765 Z1.300 F5400; move to X entry of next task
; ============================================================
; botB.0003.gcode
; 6549cd01-18f2-44c7-9efa-894c562dadb5
G1 Y31.165; move to point above task toolpaths start
G1 Z0.300 F1080; move down to toolpath start
G1 E1.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X349.586 E5.92231 F4200
G1 Y31.535 E5.94077
G1 X230.879 E11.86308
G1 Y31.165 E11.88154
; rapid-leaky
; bead-perimeter_outer
G1 X349.986 Y30.765 E17.84377 F2400
G1 Y31.935 E17.90214
G1 X230.479 E23.86437
G1 Y30.765 E23.92274
G92 E0
G1 E-1.00000 F1500
G1 Z1.300 F5400; move up from layer plane
; ============================================================
; botB.0004.gcode
; 712be8b2-c607-47ba-b4c0-cdff0c2650fc
G1 X350.786; move to X entry of next task
; ============================================================
; botB.0005.gcode
; db3dbfe9-931b-4835-9468-3f6712ce1cf9
G1 Y31.165; move to point above task toolpaths start
G1 Z0.300 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X469.493 E5.92231 F4200
G1 Y31.535 E5.94077
G1 X350.786 E11.86309
G1 Y31.165 E11.88155
; rapid-leaky
; bead-perimeter_outer
G1 X469.893 Y30.765 E17.84378 F2400
G1 Y31.935 E17.90215
G1 X350.386 E23.86437
G1 Y30.765 E23.92275
G92 E0
G1 E-1.00000 F1500
G1 Z1.300 F5400; move up from layer plane
; ============================================================
; botB.0006.gcode
; 0b5dbda7-10a2-470d-856c-421af672a220
G1 X349.586 Z1.600; move to X entry of next task
; ============================================================
; botB.0007.gcode
; 9ab2309a-6f37-4f76-a460-97c5e0931cc5
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 Y31.535 E0.01846 F4200
G1 X230.879 E5.94077
G1 Y31.165 E5.95923
G1 X349.586 E11.88154
; rapid-leaky
; bead-perimeter_outer
G1 X349.986 Y31.935 E11.93992 F2400
G1 X230.479 E17.90214
G1 Y30.765 E17.96051
G1 X349.986 E23.92274
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botB.0008.gcode
; 804cebb4-8218-488b-aa86-38fddd382899
G1 X350.786; move to X entry of next task
; ============================================================
; botB.0009.gcode
; 73e2ae7c-e128-44cb-96c5-05a053980298
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X469.493 E5.92231 F4200
G1 Y31.535 E5.94077
G1 X350.786 E11.86309
G1 Y31.165 E11.88155
; rapid-leaky
; bead-perimeter_outer
G1 X469.893 Y30.765 E17.84378 F2400
G1 Y31.935 E17.90215
G1 X350.386 E23.86437
G1 Y30.765 E23.92275
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botB.0010.gcode
; aa01b378-93a4-404a-bd20-c2ee1466762a
G1 X349.586; move to X entry of next task
; ============================================================
; botB.0011.gcode
; 14d8b919-f2f6-4673-bf53-10f1cd71336f
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 Y31.535 E0.01846 F4200
G1 X230.879 E5.94077
G1 Y31.165 E5.95923
G1 X349.586 E11.88154
; rapid-leaky
; bead-perimeter_outer
G1 X349.986 Y31.935 E11.93992 F2400
G1 X230.479 E17.90214
G1 Y30.765 E17.96051
G1 X349.986 E23.92274
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botB.0012.gcode
; c012264f-a019-4f0a-902e-ff894a4ed4a0
G1 X350.786; move to X entry of next task
; ============================================================
; botB.0013.gcode
; 98ec8f85-ba81-46b0-82d4-5662a3156887
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X469.493 E5.92231 F4200
G1 Y31.535 E5.94077
G1 X350.786 E11.86309
G1 Y31.165 E11.88155
; rapid-leaky
; bead-perimeter_outer
G1 X469.893 Y30.765 E17.84378 F2400
G1 Y31.935 E17.90215
G1 X350.386 E23.86437
G1 Y30.765 E23.92275
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botB.0014.gcode
; 91e971a3-716a-41a4-95fb-d6f0d6cbb69a
; printEnd0
G1 Z210.000 F1080; move up from part
G1 Y1.000 F5400; move to park
M140 S0; turn off bed
M109 S0 T0; wait for nozzle to reach temperature; turn off nozzle
M107 ; turn off fans
; ============================================================
; botB.0015.gcode
; 7a38913e-b528-4f87-81ca-702a22ec7083
; printEnd1
G1 X0.000 Y1.000 Z210.000; move to x home
M84 ; disable motors
