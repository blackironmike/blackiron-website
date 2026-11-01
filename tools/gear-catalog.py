#!/usr/bin/env python3
"""
gear-catalog.py
One product list, rendered into two pages:

  gear.html      the full Storefront, every shelf
  programs.html  two mini shops (supplements, meal prep) in the
                 nutrition coaching section

Run it after editing PRODUCTS or SHELVES:

    python3 tools/gear-catalog.py

It rewrites only the HTML between the GEAR:* marker comments, so the rest of
each page is untouched. Nothing here runs at build time; the output is
committed like any other page edit.

Sources
  impact  Impact.com partner programs. Photo and tracking link come straight
          from the brand's Impact catalog, so the commission is tracked to
          the Black Iron Athletics account.
  direct  Brand programs we hold outside Impact (Thorne dispensary, 1st Phorm
          Legionnaire, LIT Method).
  amazon  Amazon Associates. Amazon's rules say product photos and prices
          must come from their API and be refreshed within 24 hours, so these
          tiles ship with a name and a tagged link only. /api/gear-amazon
          fills in the photo and price in the browser.

Copy rules for blurbs: what the product is for and who it suits. Never claim
Mike owns or uses something unless "pick" is set and that is true. Supplement
copy stays structure and function (supports, helps maintain), never a
disease or treatment claim.
"""
import html
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
AMAZON_TAG = 'blackironathletics-20'
EDC = 'https://everydadcarry.com/gear/'
PHORM_AID = 'wu74bzpq2iyrz'


def phorm(handle):
    return f'https://1stphorm.com/products/{handle}/?a_aid={PHORM_AID}'


def phorm_img(file):
    return f'https://cdn.shopify.com/s/files/1/0072/7754/3493/files/{file}'


def tl(handle):
    return 'https://transparentlabs.sjv.io/c/7701857/1281413/15725?u=' + quote(f'https://www.transparentlabs.com/products/{handle}', safe='')


def tl_img(file):
    return f'https://cdn.shopify.com/s/files/1/0866/7664/files/{file}'


def beam(handle):
    return 'https://beam.sjv.io/c/7701857/1111247/14102?u=' + quote(f'https://shopbeam.com/products/{handle}', safe='')


def beam_img(file):
    return f'https://cdn.shopify.com/s/files/1/0264/4076/1399/files/{file}'


def swol(sku, handle):
    return (f'https://swolverine.sjv.io/c/7701857/3257284/41450?prodsku={sku}&u='
            + quote(f'https://swolverine.com/products/{handle}', safe=''))


def swol_img(file):
    return f'https://cdn.shopify.com/s/files/1/1283/2557/files/{file}'


THORNE_CDN = 'https://d1vo8zfysxy97v.cloudfront.net/media/product/'

# ---------------------------------------------------------------------------
# Products. Keys:
#   id, shelf, group (optional sub-heading inside a shelf), src, brand, name,
#   blurb, url, img (impact/direct), asin (amazon), pick (coach pick badge,
#   only when true), kw (extra search words), edc (Every Dad Carry review
#   slug), cta (button label brand, defaults to brand)
# ---------------------------------------------------------------------------
P = []
def add(**k):
    P.append(k)

# ---- GYM BAG: what you wear and carry in class ----------------------------
add(id='iron-bull-sleeves', shelf='gym-bag', src='amazon', brand='Iron Bull Strength',
    name='7mm knee sleeves', asin='B07B45BP44',
    blurb='Warmth and a little support for heavy squat days. Size by the chart, not by feel.',
    kw='knee sleeves squat support compression neoprene')
add(id='gymreapers-wraps', shelf='gym-bag', src='amazon', brand='Gymreapers',
    name='18 inch wrist wraps', asin='B07BSRNCN3',
    blurb='For heavy presses and front rack work. Keep them in the bag for your top sets, not every set.',
    kw='wrist wraps press bench front rack')
add(id='phorm-belt', shelf='gym-bag', src='direct', brand='1st Phorm',
    name='Leather lifting belt', url=phorm('1st-phorm-leather-lifting-belt'),
    img=phorm_img('1stphorm_accessories_liftingbelt_1stphormleatherliftingbelt_camo_0001.jpg'),
    blurb='A belt for when your squat and deadlift outgrow bracing alone. Learn to brace first, then add the belt.',
    kw='belt lifting weightlifting powerlifting leather')
add(id='adidas-powerlift', shelf='gym-bag', src='amazon', brand='adidas',
    name='Powerlift 5 lifting shoes', asin='B0F4WPQ1MZ',
    blurb='A raised heel and a flat, hard sole. The quickest fix for a squat that tips forward.',
    kw='lifting shoes weightlifting squat shoes heel')
add(id='nike-metcon', shelf='gym-bag', src='amazon', brand='Nike',
    name='Metcon 9 training shoes', asin='B0D95KVSW2',
    blurb='One shoe for lifting, rowing, rope climbs and short runs. The most common shoe on our floor.',
    kw='training shoes cross training metcon sneakers')
add(id='jerkfit-grips', shelf='gym-bag', src='amazon', brand='JerkFit',
    name='Raw Grips 3.0', asin='B07DR7VPRZ',
    blurb='Two-finger leather grips for pull-ups and toes-to-bar, so a big gymnastics day does not cost you your hands.',
    kw='grips gymnastics pull ups hand protection gloves')
add(id='gymreapers-straps', shelf='gym-bag', src='amazon', brand='Gymreapers',
    name='Lifting straps', asin='B07BB3VQ42',
    blurb='For heavy pulls when your grip quits before your back does. Train grip too, just not on your top set.',
    kw='lifting straps deadlift grip')
add(id='bear-komplex-rope', shelf='gym-bag', src='amazon', brand='Bear KompleX',
    name='Speed jump rope', asin='B0D6XF6K3Y',
    blurb='Ball bearing handles and an adjustable cable. The rope you learn double-unders on.',
    kw='jump rope speed rope double unders')
add(id='511-duffel', shelf='gym-bag', src='impact', brand='5.11 Tactical',
    name='PT-R Daily Grind duffel 32L',
    url='https://511.pxf.io/c/7701857/2160246/14180?prodsku=198900106776&u=https%3A%2F%2Fwww.511tactical.com%2Fpt-r-daily-grind-duffel.html%3Fsku%3D198900106776%26country%3Dus&intsrc=APIG_19374',
    img='https://tactical511.widen.net/content/opemc7tmbv/webp/56856ABR_701_03.webp',
    blurb='Shoes, belt, sleeves and a change of clothes, with a pocket that keeps the sweaty stuff apart.',
    kw='gym bag duffel bag 511')
add(id='511-trainer-bag', shelf='gym-bag', src='impact', brand='5.11 Tactical',
    name='Range Ready trainer bag 50L',
    url='https://511.pxf.io/c/7701857/2160246/14180?prodsku=888579885163&u=https%3A%2F%2Fwww.511tactical.com%2Frange-ready-trainer-bag.html%3Fsku%3D888579885163%26country%3Dus&intsrc=APIG_19374',
    img='https://tactical511.widen.net/content/n1cyct90rn/webp/56567_019_RangeReadyTrainerBag_05.webp',
    blurb='The bigger option for people who bring everything: lifting shoes, a jump rope, a belt and lunch.',
    kw='gym bag trainer bag 511 backpack')

# ---- WATCHES ----------------------------------------------------------------
SUUNTO = 'https://suunto.pxf.io/c/7701857/2975536/35454?prodsku={sku}&u=https%3A%2F%2Fus.suunto.com%2Fproducts%2F{h}&intsrc=APIG_23878'
SUUNTO_IMG = 'https://cdn.shopify.com/s/files/1/0645/6488/7733/files/'
add(id='suunto-run', shelf='watches', src='impact', brand='Suunto', name='Suunto Run',
    url=SUUNTO.format(sku='51258879148213', h='suunto-run-all-black'),
    img=SUUNTO_IMG + 'Suunto_Run-ALL_BLACK-Front-ALL_BLACK-watchface_EN.png',
    blurb='A light, simple GPS watch for steps, runs and heart rate. The easy starting point.',
    kw='watch gps running heart rate tracker')
add(id='suunto-race-s', shelf='watches', src='impact', brand='Suunto', name='Suunto Race S',
    url=SUUNTO.format(sku='44418070544565', h='suunto-race-s-all-black'),
    img=SUUNTO_IMG + 'image1_6afcde1b-eeab-42ec-bafd-414bf72faaeb.png',
    blurb='Training load, recovery and sleep tracking in a smaller case. Plenty for most people who train hard.',
    kw='watch gps training recovery sleep')
add(id='suunto-race-2', shelf='watches', src='impact', brand='Suunto', name='Suunto Race 2',
    url=SUUNTO.format(sku='51576811159733', h='suunto-race-2-all-black'), edc='suunto-race-2',
    img=SUUNTO_IMG + 'Suunto_Race2-AllBlack-Front-AllBlack-watchface-c40-sailfish_EN.png',
    blurb='The full-size version, with a bigger screen and a longer battery for long weeks and long events.',
    kw='watch gps race battery')
add(id='suunto-hr-belt', shelf='watches', src='impact', brand='Suunto', name='Smart heart rate belt',
    url=SUUNTO.format(sku='44247915757749', h='suunto-smart-heart-rate-belt'),
    img=SUUNTO_IMG + 'ss050579000-suunto_smart_heart_rate_belt_04.png',
    blurb='A chest strap reads heart rate more accurately than a wrist does during intervals and lifting.',
    kw='heart rate monitor chest strap')

# ---- SUPPLEMENTS ------------------------------------------------------------
add(id='thorne-creatine', shelf='supplements', group='The daily basics', src='direct', brand='Thorne',
    name='Creatine', url='https://s.thorne.com/ivqHX', pick=True,
    img=THORNE_CDN + 'sf903__ve8382489c6ce9fb7f28cdddef00e6f1ece146591.png',
    blurb='Five grams a day. Supports strength and power output. The one we stock.',
    kw='creatine monohydrate strength power')
add(id='thorne-whey', shelf='supplements', group='The daily basics', src='direct', brand='Thorne',
    name='Whey Protein Isolate', url='https://s.thorne.com/gOquC',
    img=THORNE_CDN + 'sp111__v496b30d9bd6d9b49984937cf925408c168a0561f.png',
    blurb='For the days food alone does not get you to your protein number. Mixes clean.',
    kw='protein powder whey isolate shake')
add(id='phorm-level-1', shelf='supplements', group='The daily basics', src='direct', brand='1st Phorm',
    name='Level-1 protein', url=phorm('level-1'), pick=True, edc='first-phorm-level-1',
    img=phorm_img('level-1-birthday-cake.png'),
    blurb='A slower protein that sits like a meal. Good for the gap between lunch and an evening class.',
    kw='protein powder meal replacement level 1')
add(id='tl-whey', shelf='supplements', group='The daily basics', src='impact', brand='Transparent Labs',
    name='Grass-fed whey isolate', url=tl('whey-protein-isolate'), edc='transparent-labs-grass-fed-whey-protein-isolate',
    img=tl_img('01_chocolate.png'),
    blurb='Grass-fed whey with a short ingredient list. Supports muscle recovery after training.',
    kw='protein powder whey isolate grass fed')
add(id='swol-creatine', shelf='supplements', group='The daily basics', src='impact', brand='Swolverine',
    name='Creatine monohydrate', url=swol('39886005698638', 'creatine-monohydrate'),
    img=swol_img('CreatineMonohydrate-Front.webp'),
    blurb='Plain creatine, nothing added. Supports strength and power with daily use.',
    kw='creatine monohydrate')
add(id='thorne-multi', shelf='supplements', group='The daily basics', src='direct', brand='Thorne',
    name='Multi-Vitamin Elite', url='https://s.thorne.com/7qflr',
    img=THORNE_CDN + 'vm114nc__v59f2e2230168349549da2930659889eb3ad55612.png',
    blurb='A morning and evening split. Supports energy metabolism and immune function through a hard block.',
    kw='multivitamin vitamins daily')

add(id='c4-original', shelf='supplements', group='Before and during training', src='impact', brand='C4',
    name='C4 Original pre-workout', edc='c4-original-pre-workout',
    url='https://cellucor.sjv.io/c/7701857/3960641/54611?prodsku=7359058477118&u=https%3A%2F%2Fcellucor.com%2Fproducts%2Fc4-original&intsrc=APIG_35014',
    img='https://cdn.shopify.com/s/files/1/1492/2278/files/C4AN_1002_Brand_C4YellowLabel_Transition_C4Original_CoreFlavors_BasicPDPs-OG-IBR-Hero-Grey.png',
    blurb='The classic pre-workout. Caffeine for energy and focus on the days the 5:30 alarm wins.',
    kw='pre workout preworkout energy caffeine c4')
add(id='swol-pre', shelf='supplements', group='Before and during training', src='impact', brand='Swolverine',
    name='PRE', url=swol('39274648698958', 'pre'), edc='swolverine-pre',
    img=swol_img('PRE-Mango-Front.webp'),
    blurb='A pre-workout built for endurance and focus. Supports performance through long sessions.',
    kw='pre workout preworkout energy')
add(id='tl-bulk', shelf='supplements', group='Before and during training', src='impact', brand='Transparent Labs',
    name='Bulk pre-workout', url=tl('bulk-preworkout'), edc='transparent-labs-bulk-pre-workout',
    img=tl_img('TL_Bulk_30S_BR_1_1_1defd9cb-a9d2-4603-9509-7b02cd578d47.png'),
    blurb='Fully disclosed doses, no proprietary blend. Supports energy and endurance for heavy days.',
    kw='pre workout preworkout energy')
add(id='phorm-project-1', shelf='supplements', group='Before and during training', src='direct', brand='1st Phorm',
    name='Project-1 pre-workout', url=phorm('project-1-pre-workout'),
    img=phorm_img('project-1-sweet-peach-caffeine.png'),
    blurb='Energy, focus and pump support in one scoop. Available caffeinated or stim-free.',
    kw='pre workout preworkout project 1')
add(id='swol-intra', shelf='supplements', group='Before and during training', src='impact', brand='Swolverine',
    name='INTRA', url=swol('6792916533326', 'intra'), edc='swolverine-intra',
    img=swol_img('Intra-Front.webp'),
    blurb='Amino acids and electrolytes to sip during long or hot sessions. Supports hydration and endurance.',
    kw='intra workout eaa bcaa electrolytes hydration')
add(id='xtend-bcaa', shelf='supplements', group='Before and during training', src='impact', brand='XTEND',
    name='XTEND Original BCAA',
    url='https://cellucor.sjv.io/c/7701857/3960641/54611?prodsku=42684436283454&u=https%3A%2F%2Fcellucor.com%2Fproducts%2Fxtend-original%3Fvariant%3D42684436283454&intsrc=APIG_35014',
    img='https://cdn.shopify.com/s/files/1/1492/2278/files/XTEND_1144_Digital_Relabel_FlowThrough_Assets_PDPs_OnGreyBackground-XTEND-OG30-BRI.png',
    blurb='Branched-chain amino acids with electrolytes. Something with flavor to sip through a long session.',
    kw='bcaa amino intra workout')
add(id='phorm-hydration', shelf='supplements', group='Before and during training', src='direct', brand='1st Phorm',
    name='Hydration Sport', url=phorm('hydration-sport'),
    img=phorm_img('hydration-sticks-sport-salted-watermelon.png'),
    blurb='Electrolyte sticks for Texas summers and sweaty classes. Supports hydration.',
    kw='electrolytes hydration salt')
add(id='c4-energy', shelf='supplements', group='Before and during training', src='impact', brand='C4',
    name='C4 Performance Energy, 12 pack', edc='c4-performance-energy',
    url='https://cellucor.sjv.io/c/7701857/3960641/54611?prodsku=39435514937406&u=https%3A%2F%2Fcellucor.com%2Fproducts%2Fc4-original-carbonated%3Fvariant%3D39435514937406&intsrc=APIG_35014',
    img='https://cdn.shopify.com/s/files/1/1492/2278/files/Cobrand_0410_CFS_DigitalRefresh_CFSLandingPage_PartnerLinkUpdates-Hero-Grey-V01.png',
    blurb='Zero sugar energy drink in a can. For people who would rather crack a can than mix a scoop.',
    kw='energy drink caffeine c4')

add(id='beam-dream', shelf='supplements', group='Sleep and recovery', src='impact', brand='Beam',
    name='Dream', url=beam('dream-powder-8'),
    img=beam_img('dream-og-shopall_fabaf99c-66b8-44ee-9db9-fa641f4935e5.jpg'),
    blurb='A warm nighttime drink with magnesium and other sleep-support ingredients. Supports restful sleep.',
    kw='sleep magnesium night recovery')
add(id='tl-sleep', shelf='supplements', group='Sleep and recovery', src='impact', brand='Transparent Labs',
    name='Sleep and Recover', url=tl('sleep-supplement'),
    img=tl_img('TL_SLEEP-RECOVER_120_1_1.png'),
    blurb='Capsules for the nights you want a little help winding down. Supports sleep quality.',
    kw='sleep recovery melatonin')
add(id='swol-mag', shelf='supplements', group='Sleep and recovery', src='impact', brand='Swolverine',
    name='Magnesium bisglycinate', url=swol('49727013454104', 'magnesium-bisglycinate'),
    img=swol_img('Magnesium-Front.webp'),
    blurb='A gentle form of magnesium. Supports muscle function and relaxation in the evening.',
    kw='magnesium sleep recovery')
add(id='thorne-amino', shelf='supplements', group='Sleep and recovery', src='direct', brand='Thorne',
    name='Amino Complex', url='https://s.thorne.com/4AYih',
    img=THORNE_CDN + 'sp641__v5d864686891ec733704f50f55b51dbb6f3c911a5.png',
    blurb='Essential amino acids. Supports muscle protein synthesis when meals are spread thin.',
    kw='amino acids eaa recovery')
add(id='tl-creatine-hmb', shelf='supplements', group='Sleep and recovery', src='impact', brand='Transparent Labs',
    name='Creatine HMB', url=tl('creatine-hmb'), edc='transparent-labs-creatine-hmb',
    img=tl_img('TL_CreatineHMB_30S_U_1_2.png'),
    blurb='Creatine paired with HMB. Supports strength and helps maintain lean muscle during a cut.',
    kw='creatine hmb strength')

# ---- MEAL PREP --------------------------------------------------------------
add(id='trifecta-lean', shelf='meal-prep', group='Meals made for you', src='impact', brand='Trifecta',
    name='Get Lean meal plan', edc='trifecta-meal-delivery',
    url='https://trifectanutrition.llbyf9.net/c/7701857/3373483/4609?prodsku=GLM1000&u=https%3A%2F%2Fshop.trifectanutrition.com%2Fshop%2Fmeal-plans%2Fget-lean-meal-plan%2F&intsrc=APIG_28485',
    img='https://uploads-v2.trifectanutrition.com/wp-content/uploads/2024/11/07151512/PL0043CX-001-2.jpg',
    blurb='Portioned, macro-counted meals delivered weekly. The easiest way to hit your numbers in a busy week.',
    kw='meal delivery meal plan prepared meals macros trifecta')
add(id='trifecta-build', shelf='meal-prep', group='Meals made for you', src='impact', brand='Trifecta',
    name='Protein Build meal plan',
    url='https://trifectanutrition.llbyf9.net/c/7701857/3373483/4609?prodsku=PBM1000&u=https%3A%2F%2Fshop.trifectanutrition.com%2Fshop%2Fmeal-plans%2Fprotein-build-meal-plan%2F&intsrc=APIG_28485',
    img='https://uploads-v2.trifectanutrition.com/wp-content/uploads/2024/12/02112611/PM0006CX-002-2.jpg',
    blurb='Bigger, higher-protein portions for a building phase. Same delivery, more food.',
    kw='meal delivery high protein meal plan trifecta')
add(id='fuel-meals', shelf='meal-prep', group='Meals made for you', src='impact', brand='Fuel Meals',
    name='Fuel Meals', url='https://fuel-meals.pxf.io/c/7701857/1513985/17798',
    img='https://www.fuelmeals.com/social-share.jpg',
    blurb='Chef-made, high-protein meals built to your macros, shipped fresh. Pick your meals each week.',
    kw='meal delivery prepared meals macros fuel meals')
add(id='trifecta-chicken', shelf='meal-prep', group='Meals made for you', src='impact', brand='Trifecta',
    name='Sous vide chicken breast, a la carte',
    url='https://trifectanutrition.llbyf9.net/c/7701857/3373483/4609?prodsku=MP0002CX&u=https%3A%2F%2Fshop.trifectanutrition.com%2Fshop%2Fmeal-prep%2Fprotein%2Fgrilled-chicken-breast%2F&intsrc=APIG_28485',
    img='https://uploads-v2.trifectanutrition.com/wp-content/uploads/2025/02/18115735/MP0002CX-003-1.jpg',
    blurb='Cooked protein by the pound. Pair it with your own rice and vegetables and the prep is half done.',
    kw='chicken protein bulk meal prep trifecta a la carte')

add(id='etekcity-scale', shelf='meal-prep', group='Prep it yourself', src='amazon', brand='Etekcity',
    name='Digital food scale', asin='B0113UZJE2', edc='etekcity-ek6015-food-scale',
    blurb='Grams and ounces with a tare button. The single most useful tool for learning what a portion looks like.',
    kw='food scale kitchen scale grams meal prep')
add(id='etekcity-scale-22', shelf='meal-prep', group='Prep it yourself', src='amazon', brand='Etekcity',
    name='22 lb rechargeable food scale', asin='B09HM2TN5Z',
    blurb='A bigger platform for weighing a whole batch, rechargeable, and it shrugs off a splash.',
    kw='food scale kitchen scale rechargeable batch')
add(id='rubbermaid-glass', shelf='meal-prep', group='Prep it yourself', src='amazon', brand='Rubbermaid',
    name='Brilliance glass containers, 9 piece', asin='B08BR9HBZ3',
    blurb='Oven, microwave and dishwasher safe, with lids that actually seal. Built for reheating a week of lunches.',
    kw='food storage containers glass meal prep')
add(id='komuee-glass', shelf='meal-prep', group='Prep it yourself', src='amazon', brand='KOMUEE',
    name='30 oz glass meal prep containers, 10 pack', asin='B08X4615SC',
    blurb='Ten matching single-meal containers. One Sunday, ten meals, done.',
    kw='meal prep containers glass')
add(id='mcirco-divided', shelf='meal-prep', group='Prep it yourself', src='amazon', brand='M MCIRCO',
    name='Two-compartment glass containers, 10 pack', asin='B0CP5VBGNM',
    blurb='Divided glass keeps the protein and the sides apart, which keeps portions honest.',
    kw='meal prep containers divided compartment glass')
add(id='rubbermaid-plastic', shelf='meal-prep', group='Prep it yourself', src='amazon', brand='Rubbermaid',
    name='Brilliance plastic containers, 14 piece', asin='B07X1TMQ34',
    blurb='Lighter than glass for the gym bag and the cooler, still leak-proof.',
    kw='food storage containers plastic meal prep')

# ---- RECOVERY ---------------------------------------------------------------
add(id='lit-method', shelf='recovery', src='direct', brand='LIT Method',
    name='Sauna and cold plunge', url='https://www.litmethod.com/',
    img='/images/renderings/2026-08-01-recovery-room-rendering.jpg', pick=True, local=True,
    blurb='Where our new recovery room&rsquo;s sauna and cold plunges come from. See the full line at LIT.',
    kw='sauna cold plunge recovery room lit method')
add(id='theragun-relief', shelf='recovery', src='amazon', brand='Therabody',
    name='Theragun Relief', asin='B0DG6SX3VS', edc='theragun-relief',
    blurb='A simple, quiet massage gun. Ten minutes on the legs after a heavy lower day.',
    kw='massage gun percussion theragun')
add(id='merach-massage', shelf='recovery', src='impact', brand='MERACH',
    name='Percussion massage gun',
    url='https://hongkongmerachtechnologycolimited.pxf.io/c/7701857/3281319/42158?prodsku=44590326743215&u=https%3A%2F%2Fmerachfit.com%2Fproducts%2Fpercussion-massage-tools-with-6-massage-heads-10mm-amplitude&intsrc=APIG_27151',
    img='https://cdn.shopify.com/s/files/1/0507/1611/5119/files/1_3481753e-1198-4942-88a7-8e4ab93f57f2.webp',
    blurb='Six heads and real amplitude for the price. The budget way into a massage gun.',
    kw='massage gun percussion')
add(id='triggerpoint-grid', shelf='recovery', src='amazon', brand='TriggerPoint',
    name='GRID foam roller', asin='B0040EGNIU', edc='triggerpoint-grid-1-foam-roller',
    blurb='Firm enough to do something, small enough for the gym bag.',
    kw='foam roller mobility')
add(id='lacrosse-balls', shelf='recovery', src='amazon', brand='Kieba',
    name='Lacrosse massage balls', asin='B017V7UKW2',
    blurb='The cheapest recovery tool that works. Feet, hips and upper back.',
    kw='lacrosse ball massage ball mobility')
add(id='normatec', shelf='recovery', src='amazon', brand='Hyperice',
    name='Normatec 3 compression boots', asin='B0B72QBWHC',
    blurb='Air compression boots for heavy training weeks. The splurge, for the person who has everything else.',
    kw='compression boots recovery normatec')

# ---- TREADMILLS AND CARDIO -------------------------------------------------
MERACH = 'https://hongkongmerachtechnologycolimited.pxf.io/c/7701857/3281319/42158?prodsku={sku}&u=https%3A%2F%2Fmerachfit.com%2Fproducts%2F{h}&intsrc=APIG_27151'
MCDN = 'https://cdn.shopify.com/s/files/1/0507/1611/5119/files/'
add(id='merach-t12-pro', shelf='cardio', src='impact', brand='MERACH', name='T12 Pro treadmill', pick=True,
    url=MERACH.format(sku='46446402863279', h='t12-pro-foldable-treadmill-with-15-auto-incline'), edc='merach-t12-pro-treadmill',
    img=MCDN + 'T12B4-T12FoldableTreadmillPro-hero-pic-1.jpg',
    blurb='The one in my garage. Folds up, 15 percent auto incline, and over a hundred miles in so far.',
    kw='treadmill walking incline folding t12')
add(id='merach-t31', shelf='cardio', src='impact', brand='MERACH', name='18% incline treadmill, 55 inch deck',
    url=MERACH.format(sku='46478505410735', h='merach-t31b3-treadmill-with-18-auto-incline'),
    img=MCDN + 'T31B3-AMZ_2.jpg',
    blurb='A longer, wider belt for real running, with an 18 percent incline for steep walks.',
    kw='treadmill running incline')
add(id='merach-r50', shelf='cardio', src='impact', brand='MERACH', name='NovaRow R50 Pro air rower',
    url=MERACH.format(sku='44061212115119', h='novarow-r50-air-resistance-rower'),
    img=MCDN + '1_7.png',
    blurb='Air resistance like the rowers in class, so the harder you pull, the harder it gets.',
    kw='rower rowing machine air rower cardio')
add(id='merach-s28', shelf='cardio', src='impact', brand='MERACH', name='S28 smart exercise bike',
    url=MERACH.format(sku='44590417936559', h='s28-smart-off-road-racing-bike-with-adjustable-incline-6'),
    img=MCDN + 'S28B1.jpg',
    blurb='Magnetic resistance and an app. Low-impact cardio for the days your joints want a break.',
    kw='bike exercise bike cycling cardio')

# ---- DESK SETUP -------------------------------------------------------------
add(id='uplift-v3', shelf='desk', src='impact', brand='UPLIFT Desk', name='V3 standing desk', pick=True,
    url='https://upliftdesk.sjv.io/c/7701857/2037399/22058?prodsku=UPL960-black-lam-60x24&u=http%3A%2F%2Fcheckout.upliftdesk.com%2F2-leg-standing-desk%2F&intsrc=APIG_17322',
    img='https://cdn11.bigcommerce.com/s-l85bzww3lo/products/890/images/38645/Final_MVT011_and_UPL964_Inclining_Walking_01496_2__22750.1787774251.1217.655.jpg',
    edc='uplift-v3-standing-desk',
    blurb='The desk I work at. Rock solid at standing height, which is the whole point.',
    kw='standing desk desk office uplift')
add(id='merach-w60', shelf='desk', src='impact', brand='MERACH', name='UltraWalk W60 walking pad',
    url=MERACH.format(sku='46969946472623', h='merach-ultrawalk-w60-walking-pad-treadmill-with-12-auto-incline-under-desk-walking-pad-400lb-capacity-max-3-5hp-heavy-duty-walking-pad-with-incline-for-tall-people-with-bt-speaker-rgb-light-app'),
    img=MCDN + 'w60-b2-amz-woman_1.png',
    blurb='Slides under a standing desk, with a 12 percent incline for walking through calls.',
    kw='walking pad under desk treadmill incline')
add(id='topo-mat', shelf='desk', src='amazon', brand='Ergodriven', name='Topo standing mat',
    asin='B00V3TO9EK', edc='ergodriven-topo',
    blurb='Not flat on purpose. The bumps keep you shifting your weight, which keeps you standing longer.',
    kw='standing mat anti fatigue mat desk')
add(id='fezibo-board', shelf='desk', src='amazon', brand='FEZIBO', name='Balance board',
    asin='B07HD838VP',
    blurb='A rocker board for the standing desk. Gives your legs something to do besides lock out.',
    kw='balance board standing desk wobble')

# ---- HOME GYM ---------------------------------------------------------------
add(id='kettlebell', shelf='home-gym', src='amazon', brand='Amazon Basics', name='Cast iron kettlebell',
    asin='B0731FCS7T', edc='amazon-basics-cast-iron-kettlebell',
    blurb='If you only buy one weight for home, make it a kettlebell. Most people start around 16 kg.',
    kw='kettlebell weight home gym')
add(id='bowflex-552', shelf='home-gym', src='amazon', brand='Bowflex', name='SelectTech 552 dumbbells',
    asin='B0FRNG2N5H',
    blurb='A rack of dumbbells from 5 to 52.5 pounds in the corner of a room.',
    kw='adjustable dumbbells weights home gym')
add(id='511-vest', shelf='home-gym', src='impact', brand='5.11 Tactical', name='TacTec trainer weight vest',
    url='https://511.pxf.io/c/7701857/2160246/14180?prodsku=888579911763&u=https%3A%2F%2Fwww.511tactical.com%2Ftactec-trainer-weight-vest.html%3Fsku%3D888579911763%26country%3Dus&intsrc=APIG_19374',
    img='https://tactical511.widen.net/content/sfxnvwuk0j/webp/56693ABR_721_01.webp', edc='511-tactec-trainer-weight-vest',
    blurb='Turns a walk into training and a Murph into a Murph. Takes standard plates.',
    kw='weight vest murph rucking')
add(id='sunpow-bands', shelf='home-gym', src='amazon', brand='SUNPOW', name='Pull-up assist bands, 5 pack',
    asin='B07K1823XB',
    blurb='Five levels of help for pull-ups, plus warm-ups and travel workouts.',
    kw='resistance bands pull up bands')
add(id='pullup-bar', shelf='home-gym', src='amazon', brand='Sportneer', name='Doorway pull-up bar',
    asin='B09JC86WNK',
    blurb='No drilling, adjustable width, and it holds more than you would think.',
    kw='pull up bar doorway chin up')

# ---------------------------------------------------------------------------
SHELVES = [
    ('gym-bag', 'Gym bag', 'What you wear and carry', 'What people wear|to class.',
     'None of it is required on day one. When the weights get heavy and the gymnastics gets harder, this is the short list.'),
    ('supplements', 'Supplements', 'Thorne &middot; 1st Phorm &middot; Swolverine &middot; Transparent Labs &middot; C4 &middot; Beam',
     'Supplements,|sorted by when you take them.',
     'Food first. These fill the gaps. If you compete in a tested sport, check the label on the specific product before you buy it.'),
    ('meal-prep', 'Meal prep', 'Trifecta &middot; Fuel Meals &middot; scales and containers',
     'Meal prep,|done for you or done yourself.',
     'Have the meals made, or make them on Sunday. Either way, a food scale is how you learn what a portion actually looks like.'),
    ('recovery', 'Recovery', 'LIT Method &middot; at-home tools', 'Recovery,|at the gym and at home.',
     'Our new recovery room runs on LIT Method sauna and cold plunge. Below that, the tools worth having at home.'),
    ('cardio', 'Treadmills and cardio', 'MERACH', 'Treadmills,|rowers and bikes.',
     'The MERACH lineup, starting with the treadmill in my garage.'),
    ('desk', 'Desk setup', 'UPLIFT &middot; MERACH', 'The desk I work at,|and what goes under it.',
     'If you sit for a living, this is the most useful thing on the page.'),
    ('watches', 'Watches', 'Suunto', 'Watches|and heart rate.',
     'Steps, sleep, heart rate and training load, from a watch that keeps going between charges.'),
    ('home-gym', 'Home gym', 'For the garage', 'The short list|for the garage.',
     'For the days you cannot make it in. You do not need much.'),
]

SRC_CTA = {'amazon': 'Amazon'}


def e(s):
    return html.escape(s, quote=True)


def tile(p, compact=False):
    src = p['src']
    cta = p.get('cta') or SRC_CTA.get(src) or p['brand']
    kw = (p.get('kw', '') + ' ' + p['brand'].lower()).strip()
    tag = '<span class="ptag">Coach pick</span>' if p.get('pick') else ''
    if src == 'amazon':
        href = f'https://www.amazon.com/dp/{p["asin"]}/?tag={AMAZON_TAG}'
        media = '<span class="ptile-img amz-img" aria-hidden="true"></span>'
        attrs = f' data-asin="{p["asin"]}"'
        price = '<b class="amz-price"></b>'
        cls = 'ptile no-price amz'
    else:
        href = p['url']
        dims = '' if p.get('local') else ''
        media = (f'<span class="ptile-img"><img src="{e(p["img"])}" alt="" loading="lazy" decoding="async"'
                 f' onerror="this.closest(\'.ptile\').classList.add(\'no-img\');this.closest(\'.ptile-img\').style.display=\'none\'"></span>')
        attrs = ''
        price = ''
        cls = 'ptile no-price'
    blurb = '' if compact else f'<span class="ptile-blurb">{p["blurb"]}</span>'
    return (f'<a class="{cls}" href="{e(href)}" target="_blank" rel="nofollow sponsored noopener"'
            f' data-product="{e(p["name"])}" data-brand="{e(p["brand"])}" data-src="{src}" data-kw="{e(kw)}"{attrs}>'
            f'{tag}{media}<span class="ptile-brand">{e(p["brand"])}</span>'
            f'<span class="ptile-name">{e(p["name"])}</span>{blurb}'
            f'<span class="ptile-foot">{price}<em>Shop at {e(cta)}<span aria-hidden="true">&nbsp;&rarr;</span></em></span></a>')


def reviews_row(items):
    revs = [(p['name'], p['edc']) for p in items if p.get('edc')]
    if not revs:
        return ''
    links = ''.join(f'<a class="finder-chip" href="{EDC}{slug}" target="_blank" rel="noopener">{e(name)}</a>' for name, slug in revs)
    return ('<div class="edc-row"><b>Full reviews on Every Dad Carry</b>'
            f'<div class="finder-chips">{links}</div></div>')


def render_storefront():
    out = []
    for key, short, sub, h2, lead in SHELVES:
        items = [p for p in P if p['shelf'] == key]
        groups = []
        for p in items:
            g = p.get('group', '')
            if g not in groups:
                groups.append(g)
        kw = ' '.join(sorted({w for p in items for w in p.get('kw', '').split()}))
        a, b_ = h2.split('|', 1)
        title = f'{e(a.strip())}<br><span class="outline">{e(b_.strip())}</span>'
        body = []
        for g in groups:
            tiles = ''.join(tile(p) for p in items if p.get('group', '') == g)
            if g:
                body.append(f'<div class="shelf-group"><h3 class="shelf-sub">{e(g)}</h3><div class="shop-grid">{tiles}</div></div>')
            else:
                body.append(f'<div class="shelf-group"><div class="shop-grid">{tiles}</div></div>')
        out.append(
            f'<section class="sect shelf-sect" id="{key}" aria-label="{e(short)}" data-kw="{e(short.lower() + " " + kw)}">'
            f'<div class="wrap"><span class="eyebrow">{sub}</span><h2>{title}</h2>'
            f'<p class="lead">{lead}</p>{"".join(body)}{reviews_row(items)}</div></section>')
    return '\n'.join(out)


def render_chips():
    return ''.join(f'<a class="finder-chip" href="#{k}">{e(s)}</a>' for k, s, *_ in SHELVES)


def render_tiles_html():
    tiles = []
    for key, short, *_ in SHELVES:
        items = [p for p in P if p['shelf'] == key]
        img = next((p['img'] for p in items if p.get('img')), '')
        tiles.append(f'<a class="shelf-tile" href="#{key}"><span class="shelf-tile-img">'
                     + (f'<img src="{e(img)}" alt="" loading="lazy" decoding="async">' if img else '')
                     + f'</span><b>{e(short)}</b><span>{len(items)} picks</span></a>')
    return '<div class="shelf-tiles">' + ''.join(tiles) + '</div>'


MINI = {
    'supplements': ['thorne-creatine', 'phorm-level-1', 'tl-whey', 'c4-original', 'swol-intra', 'beam-dream'],
    'meal-prep': ['trifecta-lean', 'fuel-meals', 'etekcity-scale', 'rubbermaid-glass', 'komuee-glass', 'trifecta-chicken'],
}


def render_mini(key):
    by = {p['id']: p for p in P}
    return '<div class="shop-grid mini-shop">' + ''.join(tile(by[i]) for i in MINI[key]) + '</div>'


def inject(path, marker, content):
    s = path.read_text(encoding='utf-8')
    pat = re.compile(rf'(<!-- GEAR:{marker}:START -->).*?(<!-- GEAR:{marker}:END -->)', re.S)
    if not pat.search(s):
        raise SystemExit(f'marker GEAR:{marker} not found in {path.name}')
    s = pat.sub(lambda m: m.group(1) + '\n' + content + '\n' + m.group(2), s, count=1)
    path.write_text(s, encoding='utf-8')


if __name__ == '__main__':
    gear = ROOT / 'gear.html'
    inject(gear, 'CHIPS', render_chips())
    inject(gear, 'TILES', render_tiles_html())
    inject(gear, 'SHELVES', render_storefront())
    prog = ROOT / 'programs.html'
    inject(prog, 'MINI-SUPPLEMENTS', render_mini('supplements'))
    inject(prog, 'MINI-MEALPREP', render_mini('meal-prep'))
    counts = {}
    for p in P:
        counts[p['src']] = counts.get(p['src'], 0) + 1
    print(f'{len(P)} products', counts)
