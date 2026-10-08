# Genera tests/partidas/anil.rxdata, una partida de Pokémon Essentials falsa
# pero con la misma forma que la de verdad, para probar el lector de partidas
# (src/lib/partida) sin depender de que alguien pase la suya.
#
# Uso: ruby scripts/partida-de-prueba.rb
#
# Las clases son de mentira (solo llevan las variables que guarda Essentials
# v21.1), pero Marshal.dump las escribe igual que el juego: con referencias a
# objetos repetidos, símbolos repetidos, textos UTF-8, números grandes y
# clases con `_dump` (Table, Color), que es lo que tiene que aguantar el lector.

require "set"

class Table
  def initialize(datos) = @datos = datos
  def _dump(_nivel) = [1, @datos.size, *@datos].pack("V*")
end

class Color
  def _dump(_nivel) = [255.0, 0.0, 0.0, 255.0].pack("E*")
end

class Pokemon
  class Move
    def initialize(id) = (@id = id; @pp = 10; @ppup = 0)
  end

  class Owner
    def initialize(id, name) = (@id = id; @name = name; @gender = 0; @language = 1)
  end

  def initialize(especie, campos = {})
    @species = especie
    @form = 0
    @forced_form = nil
    @time_form_set = nil
    @exp = 1000
    @steps_to_hatch = 0
    @hp = 20
    @status = :NONE
    @statusCount = 0
    @name = nil
    @shiny = nil
    @super_shiny = nil
    @ability_index = nil
    @ability = nil
    @nature = nil
    @nature_for_stats = nil
    @item = nil
    @mail = nil
    @moves = []
    @first_moves = []
    @ribbons = []
    @iv = { HP: 31, ATTACK: 20 }
    @ev = { HP: 0, ATTACK: 4 }
    @happiness = 70
    @poke_ball = :POKEBALL
    @markings = []
    @obtain_method = 0
    @obtain_map = 0
    @obtain_text = nil
    @obtain_level = 5
    @timeReceived = 1_759_000_000
    @personalID = 0
    @owner = nil
    @level = 5
    campos.each { |k, v| instance_variable_set("@#{k}", v) }
  end
end

class Trainer; end

class Player < Trainer
  def initialize(nombre, id, equipo) = (@name = nombre; @id = id; @party = equipo; @badges = [true, false])
end

class PokemonBox
  def initialize(nombre, pokemon) = (@name = nombre; @background = 3; @pokemon = pokemon + [nil] * (30 - pokemon.size))
end

class PokemonStorage
  def initialize(cajas) = (@boxes = cajas; @currentBox = 0; @unlockedWallpapers = [])
end

class PokemonGlobalMetadata
  def initialize(random) = (@random_enabled = random; @random_abs_pokes = { 77 => [[:LEVITATE, 0], [:PRANKSTER, 1]] }; @given_tm_moves = Set.new([:TM01]))
end

class Game_Switches
  def initialize(datos) = @data = datos
end

class Game_Map
  def initialize = (@map_id = 5; @tiles = Table.new([1, 2, 3]); @tono = Color.new; @escala = 1.5)
end

yo = Pokemon::Owner.new(123_456_789, "Draka")
movimiento = ->(*ids) { ids.map { |id| Pokemon::Move.new(id) } }

equipo = [
  # Con mote en mayúsculas, ya evolucionado, todo guardado y con objeto
  Pokemon.new(:CHARMELEON, name: "CHISPAS", ability: :BLAZE, nature: :ADAMANT, shiny: false, item: :LEFTOVERS,
                           moves: movimiento.(:EMBER, :SCRATCH, :DRAGONBREATH), obtain_map: 2, owner: yo, personalID: 3_000_000_001),
  # Sin mote, sin nada calculado: el juego lo saca de su personalID
  Pokemon.new(:PIDGEY, moves: movimiento.(:TACKLE, :GUST), obtain_map: 13, owner: yo, personalID: 123653392),
  # Una forma (Vulpix de Alola) con un mote con tilde
  Pokemon.new(:VULPIX, form: 1, name: "Nieví", moves: movimiento.(:POWDERSNOW), obtain_map: 14, owner: yo,
                       personalID: 4, ability_index: 2),
  # Un huevo: no cuenta
  Pokemon.new(:EEVEE, steps_to_hatch: 2000, owner: yo, personalID: 5),
]

cajas = [
  PokemonBox.new("Caja 1", [
    Pokemon.new(:ROYALEON, name: "Rey", moves: movimiento.(:QUICKATTACK), obtain_text: "Regalo de Bill", owner: yo,
                           personalID: 6, shiny: true, id: 77),
    nil,
    Pokemon.new(:ABRA, forced_ability: :MAGICGUARD, owner: yo, personalID: 9, obtain_map: 99),
  ]),
  PokemonBox.new("Caja 2", []),
  PokemonBox.new("Caídos", [
    Pokemon.new(:RATTATA, name: "Ratón", owner: yo, personalID: 7),
  ]),
]

randomized = {
  abilities: {
    PIDGEY: { base: [:INTIMIDATE, :STATIC], hidden: [:DROUGHT] },
    VULPIX_1: { base: [:SWIFTSWIM], hidden: [:SANDSTREAM] },
    VULPIX: { base: [:FLASHFIRE], hidden: [:DRIZZLE] },
  },
}

partida = {
  player: Player.new("Draka", 123_456_789, equipo),
  storage_system: PokemonStorage.new(cajas),
  global_metadata: PokemonGlobalMetadata.new(true),
  switches: Game_Switches.new([nil] + [false] * 47 + [true] + [false] * 10),
  map_factory: [Game_Map.new],
  randomized_data: randomized,
  game_version: "21.1",
  stats: Hash.new(0).merge(pasos: 12_345),
}

destino = File.join(__dir__, "..", "tests", "partidas", "anil.rxdata")
Dir.mkdir(File.dirname(destino)) unless Dir.exist?(File.dirname(destino))
File.binwrite(destino, Marshal.dump(partida))
puts "#{destino}: #{File.size(destino)} bytes"
