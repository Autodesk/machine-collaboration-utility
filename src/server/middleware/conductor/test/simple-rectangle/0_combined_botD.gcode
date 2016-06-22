; ============================================================
; botD.0000.gcode
; 225b02c9-4a2b-4940-b37d-a9d0b644a931
; start_code
G90; set to absolute coordinates
M82; set extruder to absolute
G21; set units to millimeters
G92 E0; reset extrusion length
M106 S0; turn off fan
M140 S0; set bed temp
M104 S220 T0; begin nozzle temperature change; set nozzle temp
G4 S6; wait for adjacent bot
G28 X0.000; home X
G1 X1.000 F5400; move away
G28 X0.000; home X again
; ============================================================
; botD.0001.gcode
; cbbbee4f-7a97-4031-9de6-a99e414989be
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
; botD.0002.gcode
; 816d10bf-54c2-4520-9ce9-d4234ea70989
G1 X490.507 Y30.765 Z1.300 F5400; move to X entry of next task
; ============================================================
; botD.0003.gcode
; bcb9449b-0f98-47a2-8aea-2e99567e4133
G1 Y31.165; move to point above task toolpaths start
G1 Z0.300 F1080; move down to toolpath start
G1 E1.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X609.214 E5.92231 F4200
G1 Y31.535 E5.94077
G1 X490.507 E11.86309
G1 Y31.165 E11.88155
; rapid-leaky
; bead-perimeter_outer
G1 X609.614 Y30.765 E17.84378 F2400
G1 Y31.935 E17.90215
G1 X490.107 E23.86437
G1 Y30.765 E23.92275
G92 E0
G1 E-1.00000 F1500
G1 Z1.300 F5400; move up from layer plane
; ============================================================
; botD.0004.gcode
; 0ac6b9e1-2bb3-491d-baff-3ebceb6740bd
G1 X610.414; move to X entry of next task
; ============================================================
; botD.0005.gcode
; 29a2fa79-3f35-4a45-a20d-f046a3450263
G1 Y31.165; move to point above task toolpaths start
G1 Z0.300 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X729.121 E5.92232 F4200
G1 Y31.535 E5.94078
G1 X610.414 E11.86310
G1 Y31.165 E11.88156
; rapid-leaky
; bead-perimeter_outer
G1 X729.521 Y30.765 E17.84379 F2400
G1 Y31.935 E17.90216
G1 X610.014 E23.86439
G1 Y30.765 E23.92276
G92 E0
G1 E-1.00000 F1500
G1 Z1.300 F5400; move up from layer plane
; ============================================================
; botD.0006.gcode
; 39f519ba-4393-4700-9ba2-96ac2279ca06
G1 X609.214 Z1.600; move to X entry of next task
; ============================================================
; botD.0007.gcode
; 47c20091-9853-4b0d-a072-eac301539fa1
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 Y31.535 E0.01846 F4200
G1 X490.507 E5.94077
G1 Y31.165 E5.95923
G1 X609.214 E11.88155
; rapid-leaky
; bead-perimeter_outer
G1 X609.614 Y31.935 E11.93992 F2400
G1 X490.107 E17.90215
G1 Y30.765 E17.96052
G1 X609.614 E23.92275
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botD.0008.gcode
; f2faa205-fbb8-4035-b1a5-931098e68a7a
G1 X610.414; move to X entry of next task
; ============================================================
; botD.0009.gcode
; e36c0dcd-42d6-4f77-8399-597e4eedf6ca
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X729.121 E5.92232 F4200
G1 Y31.535 E5.94078
G1 X610.414 E11.86310
G1 Y31.165 E11.88156
; rapid-leaky
; bead-perimeter_outer
G1 X729.521 Y30.765 E17.84379 F2400
G1 Y31.935 E17.90216
G1 X610.014 E23.86439
G1 Y30.765 E23.92276
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botD.0010.gcode
; 31100ee2-00f8-4f86-ac7c-9d29a5cd6069
G1 X609.214; move to X entry of next task
; ============================================================
; botD.0011.gcode
; bc687bc9-582d-40f3-ad22-c63d22f89089
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 Y31.535 E0.01846 F4200
G1 X490.507 E5.94077
G1 Y31.165 E5.95923
G1 X609.214 E11.88155
; rapid-leaky
; bead-perimeter_outer
G1 X609.614 Y31.935 E11.93992 F2400
G1 X490.107 E17.90215
G1 Y30.765 E17.96052
G1 X609.614 E23.92275
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botD.0012.gcode
; 01b21363-d6e1-4ffe-a9bf-0564622f41ed
G1 X610.414; move to X entry of next task
; ============================================================
; botD.0013.gcode
; 8fdb1bff-4bd6-4845-810c-cf604bdbcacd
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X729.121 E5.92232 F4200
G1 Y31.535 E5.94078
G1 X610.414 E11.86310
G1 Y31.165 E11.88156
; rapid-leaky
; bead-perimeter_outer
G1 X729.521 Y30.765 E17.84379 F2400
G1 Y31.935 E17.90216
G1 X610.014 E23.86439
G1 Y30.765 E23.92276
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botD.0014.gcode
; 824b9c0b-6921-42b1-9f78-6777f2d73cc3
; printEnd0
G1 Z210.000 F1080; move up from part
G1 Y1.000 F5400; move to park
M140 S0; turn off bed
M109 S0 T0; wait for nozzle to reach temperature; turn off nozzle
M107 ; turn off fans
; ============================================================
; botD.0015.gcode
; 6cb72132-dce9-48b7-a121-277b32c89003
; printEnd1
G1 X0.000 Y1.000 Z210.000; move to x home
M84 ; disable motors
