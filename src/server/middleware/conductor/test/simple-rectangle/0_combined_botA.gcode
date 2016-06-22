; ============================================================
; botA.0000.gcode
; bf0bb37b-92a0-4dc9-a954-3f579539ef8f
; start_code
G90; set to absolute coordinates
M82; set extruder to absolute
G21; set units to millimeters
G92 E0; reset extrusion length
M106 S0; turn off fan
M140 S0; set bed temp
M104 S220 T0; begin nozzle temperature change; set nozzle temp
G4 S0; wait for adjacent bot
G28 X0.000; home X
G1 X1.000 F5400; move away
G28 X0.000; home X again
; ============================================================
; botA.0001.gcode
; b171a690-da60-4518-8f6b-8e09d3535a41
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
; botA.0002.gcode
; 5880689d-93e2-4a74-952d-675721c41a80
G1 X101.165 F5400; move to X entry of next task
; ============================================================
; botA.0003.gcode
; d0d73d53-8e34-41e7-aed1-5472b6dc51c9
G1 Y31.165 Z1.300; move to point above task toolpaths start
G1 Z0.300 F1080; move down to toolpath start
G1 E1.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X219.772 E5.91733 F4200
G1 Y31.535 E5.93579
G1 X101.165 E11.85311
G1 Y31.165 E11.87157
; rapid-leaky
; bead-perimeter_outer
G1 X220.172 Y30.765 E17.82881 F2400
G1 Y31.935 E17.88718
G1 X100.765 E23.84442
G1 Y30.765 E23.90279
G92 E0
G1 E-1.00000 F1500
G1 Z1.300 F5400; move up from layer plane
; ============================================================
; botA.0004.gcode
; d82e0299-be21-4002-9198-7c2fff82392c
G1 X220.972; move to X entry of next task
; ============================================================
; botA.0005.gcode
; e225555d-5622-4031-92a1-895b11496c9e
G1 Y31.165; move to point above task toolpaths start
G1 Z0.300 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X339.679 E5.92231 F4200
G1 Y31.535 E5.94077
G1 X220.972 E11.86308
G1 Y31.165 E11.88154
; rapid-leaky
; bead-perimeter_outer
G1 X340.079 Y30.765 E17.84377 F2400
G1 Y31.935 E17.90214
G1 X220.572 E23.86437
G1 Y30.765 E23.92274
G92 E0
G1 E-1.00000 F1500
G1 Z1.300 F5400; move up from layer plane
; ============================================================
; botA.0006.gcode
; a206be79-7c4d-4f72-b616-233658c083f8
G1 X219.772; move to X entry of next task
; ============================================================
; botA.0007.gcode
; 19de48ee-f114-4804-a7ba-fd15aac408ff
G1 Y31.165 Z1.600; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 Y31.535 E0.01846 F4200
G1 X101.165 E5.93579
G1 Y31.165 E5.95425
G1 X219.772 E11.87157
; rapid-leaky
; bead-perimeter_outer
G1 X220.172 Y31.935 E11.92994 F2400
G1 X100.765 E17.88718
G1 Y30.765 E17.94555
G1 X220.172 E23.90279
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botA.0008.gcode
; fb2184cc-2b1e-45c1-9907-888d25a8a425
G1 X220.972; move to X entry of next task
; ============================================================
; botA.0009.gcode
; 40b90036-5894-4f03-be69-df6edf012136
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X339.679 E5.92231 F4200
G1 Y31.535 E5.94077
G1 X220.972 E11.86308
G1 Y31.165 E11.88154
; rapid-leaky
; bead-perimeter_outer
G1 X340.079 Y30.765 E17.84377 F2400
G1 Y31.935 E17.90214
G1 X220.572 E23.86437
G1 Y30.765 E23.92274
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botA.0010.gcode
; 27ab2edd-78ea-4194-aedb-fe4cdd4eec86
G1 X219.772; move to X entry of next task
; ============================================================
; botA.0011.gcode
; fe8c6b94-294f-4980-ae95-8914389f344b
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 Y31.535 E0.01846 F4200
G1 X101.165 E5.93579
G1 Y31.165 E5.95425
G1 X219.772 E11.87157
; rapid-leaky
; bead-perimeter_outer
G1 X220.172 Y31.935 E11.92994 F2400
G1 X100.765 E17.88718
G1 Y30.765 E17.94555
G1 X220.172 E23.90279
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botA.0012.gcode
; db2a45c9-3db9-4468-85d8-1a94adf79f37
G1 X220.972; move to X entry of next task
; ============================================================
; botA.0013.gcode
; 5272cd2b-30c6-409b-b3bf-5eb8f9500d00
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X339.679 E5.92231 F4200
G1 Y31.535 E5.94077
G1 X220.972 E11.86308
G1 Y31.165 E11.88154
; rapid-leaky
; bead-perimeter_outer
G1 X340.079 Y30.765 E17.84377 F2400
G1 Y31.935 E17.90214
G1 X220.572 E23.86437
G1 Y30.765 E23.92274
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botA.0014.gcode
; 4b91299f-50c3-42be-a721-d025c1993a71
; printEnd0
G1 Z210.000 F1080; move up from part
G1 Y1.000 F5400; move to park
M140 S0; turn off bed
M109 S0 T0; wait for nozzle to reach temperature; turn off nozzle
M107 ; turn off fans
; ============================================================
; botA.0015.gcode
; cf41f406-3ebc-4746-ba58-23e4c36f2b43
; printEnd1
G1 X0.000 Y1.000 Z210.000; move to x home
M84 ; disable motors
