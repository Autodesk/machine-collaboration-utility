; ============================================================
; botC.0000.gcode
; 11586144-3971-4152-9fb1-d33fa187435a
; start_code
G90; set to absolute coordinates
M82; set extruder to absolute
G21; set units to millimeters
G92 E0; reset extrusion length
M106 S0; turn off fan
M140 S0; set bed temp
M104 S220 T0; begin nozzle temperature change; set nozzle temp
G4 S4; wait for adjacent bot
G28 X0.000; home X
G1 X1.000 F5400; move away
G28 X0.000; home X again
; ============================================================
; botC.0001.gcode
; 013dea09-c5c2-4e9a-9fe6-08efa9b8b790
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
; botC.0002.gcode
; 0ab6b5b1-7a2a-49f4-9e48-b29ecc8fd7cd
G1 X360.693 Y30.765 Z1.300 F5400; move to X entry of next task
; ============================================================
; botC.0003.gcode
; b5ea0a48-f4a4-4f74-84b6-a5690c06711a
G1 Y31.165; move to point above task toolpaths start
G1 Z0.300 F1080; move down to toolpath start
G1 E1.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X479.400 E5.92232 F4200
G1 Y31.535 E5.94078
G1 X360.693 E11.86309
G1 Y31.165 E11.88155
; rapid-leaky
; bead-perimeter_outer
G1 X479.800 Y30.765 E17.84378 F2400
G1 Y31.935 E17.90215
G1 X360.293 E23.86438
G1 Y30.765 E23.92276
G92 E0
G1 E-1.00000 F1500
G1 Z1.300 F5400; move up from layer plane
; ============================================================
; botC.0004.gcode
; eb6b906f-1a90-4363-8366-2a45d9b26751
G1 X480.600; move to X entry of next task
; ============================================================
; botC.0005.gcode
; e45c96cc-5ae4-4040-8e9e-3834404e7d5b
G1 Y31.165; move to point above task toolpaths start
G1 Z0.300 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X599.307 E5.92232 F4200
G1 Y31.535 E5.94078
G1 X480.600 E11.86310
G1 Y31.165 E11.88156
; rapid-leaky
; bead-perimeter_outer
G1 X599.707 Y30.765 E17.84380 F2400
G1 Y31.935 E17.90217
G1 X480.200 E23.86441
G1 Y30.765 E23.92278
G92 E0
G1 E-1.00000 F1500
G1 Z1.300 F5400; move up from layer plane
; ============================================================
; botC.0006.gcode
; 2717a8f1-36dc-4709-85c2-5b13aa634374
G1 X479.400 Z1.600; move to X entry of next task
; ============================================================
; botC.0007.gcode
; 7efef78a-ae07-49f0-b191-34152fbb30a2
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 Y31.535 E0.01846 F4200
G1 X360.693 E5.94078
G1 Y31.165 E5.95924
G1 X479.400 E11.88155
; rapid-leaky
; bead-perimeter_outer
G1 X479.800 Y31.935 E11.93993 F2400
G1 X360.293 E17.90215
G1 Y30.765 E17.96053
G1 X479.800 E23.92276
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botC.0008.gcode
; 1c913e86-b2d5-4503-a76c-2c105cb5e5b9
G1 X480.600; move to X entry of next task
; ============================================================
; botC.0009.gcode
; f920ace3-3786-4aa1-885c-d1cbe7a5e722
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X599.307 E5.92232 F4200
G1 Y31.535 E5.94078
G1 X480.600 E11.86310
G1 Y31.165 E11.88156
; rapid-leaky
; bead-perimeter_outer
G1 X599.707 Y30.765 E17.84380 F2400
G1 Y31.935 E17.90217
G1 X480.200 E23.86441
G1 Y30.765 E23.92278
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botC.0010.gcode
; 2d8e467f-e703-466c-9e8d-2630cbaab4e1
G1 X479.400; move to X entry of next task
; ============================================================
; botC.0011.gcode
; 3e095865-8a83-4332-a89f-43bebb66f571
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 Y31.535 E0.01846 F4200
G1 X360.693 E5.94078
G1 Y31.165 E5.95924
G1 X479.400 E11.88155
; rapid-leaky
; bead-perimeter_outer
G1 X479.800 Y31.935 E11.93993 F2400
G1 X360.293 E17.90215
G1 Y30.765 E17.96053
G1 X479.800 E23.92276
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botC.0012.gcode
; 784ea57d-a166-471d-8eda-a57a5751df3c
G1 X480.600; move to X entry of next task
; ============================================================
; botC.0013.gcode
; 567a2151-5be4-4ec0-9a8c-e452521fe412
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X599.307 E5.92232 F4200
G1 Y31.535 E5.94078
G1 X480.600 E11.86310
G1 Y31.165 E11.88156
; rapid-leaky
; bead-perimeter_outer
G1 X599.707 Y30.765 E17.84380 F2400
G1 Y31.935 E17.90217
G1 X480.200 E23.86441
G1 Y30.765 E23.92278
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botC.0014.gcode
; a7856da6-4d38-4871-8162-6e8490b2cf43
; printEnd0
G1 Z210.000 F1080; move up from part
G1 Y1.000 F5400; move to park
M140 S0; turn off bed
M109 S0 T0; wait for nozzle to reach temperature; turn off nozzle
M107 ; turn off fans
; ============================================================
; botC.0015.gcode
; f6170d1c-a082-4090-9bb9-c693e53a8eda
; printEnd1
G1 X0.000 Y1.000 Z210.000; move to x home
M84 ; disable motors
